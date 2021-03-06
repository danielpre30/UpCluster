import React, { Component } from "react";
import Axios from "axios";

import {
  BASE_LOCAL_ENDPOINT,
  PROVIDER,
  CONTRACTOR,
  PROFILE
} from "../../../constants";

import "../styles/Profile.scss";

import { Auth0Context } from "../../../components/Auth/react-auth0-wrapper";
import AddComment from "../../../components/AddComment";
import ServiceList from "../../../components/ServiceList";
import ProfileHeadline from "../../../components/ProfileHeadline";
import CommentList from "../../../components/CommentList";

class Profile extends Component {
  static contextType = Auth0Context;
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.getProfile();
  }

  getProfile() {
    const { profile } = this.context;
    const id =
      this.props.match.path === PROFILE
        ? profile._id
        : this.props.match.params.id;
    Axios.get(`${BASE_LOCAL_ENDPOINT}/business/${id}?idRequest=${profile._id}`)
      .then(response => {
        this.setState(prevState => ({
          ...prevState,
          ...response.data
        }));
      })
      .catch(error => {
        this.setState(prevState => ({ ...prevState, error: error.message }));
      });
  }

  updateProfile = data => {
    this.setState(prevState => ({
      ...prevState,
      score: data.score,
      comments: data.comments
    }));
  };

  render() {
    const { business, score, services, isProvider, comments } = this.state;
    const rates = [
      { id: "priceQuality", title: "Calidad/Precio" },
      { id: "puntuality", title: "Puntualidad" },
      { id: "communication", title: "Comunicación" },
      { id: "afterSalesService", title: "Servicio Posventa" }
    ];

    const isMyProfilePage = this.props.match.path === PROFILE;

    return (
      <div className="profile">
        <ProfileHeadline
          logo={business && business.logo}
          name={business && business.name}
          typeOfService={business && business.typeOfService}
          score={score}
          isMyProfilePage={isMyProfilePage}
        >
          <ProfileHeadline.Header />
          <ProfileHeadline.Body />
          <ProfileHeadline.Score>
            <ProfileHeadline.Score.Item
              label="Puntualidad"
              points={score && score.puntuality}
            />
            <ProfileHeadline.Score.Item
              label="Comunicación"
              points={score && score.communication}
            />
            <ProfileHeadline.Score.Item
              label="Servicio Posventa"
              points={score && score.afterSalesService}
            />
            <ProfileHeadline.Score.Item
              label="Calidad/Precio"
              points={score && score.priceQuality}
            />
          </ProfileHeadline.Score>
        </ProfileHeadline>

        <ServiceList
          services={services && services.servicesAsContractor}
          type={CONTRACTOR}
        />
        <ServiceList
          services={services && services.servicesAsProvider}
          type={PROVIDER}
        />
        {
          <CommentList>
            {comments &&
              comments.map(({ _id, name, description, general }) => (
                <CommentList.Comment
                  key={_id}
                  name={name}
                  description={description}
                  score={general}
                />
              ))}
          </CommentList>
        }
        {!isMyProfilePage && isProvider ? (
          <AddComment
            rates={rates}
            id={business && business._id}
            updateProfile={this.updateProfile}
          />
        ) : (
          "No puedes agregar comentarios a este perfil"
        )}
      </div>
    );
  }
}

export default Profile;
