import React, { Component } from "react";
import Axios from "axios";

import { BASE_LOCAL_ENDPOINT, EDIT } from "../../../constants";

import "../styles/SignupForm.scss";
import LogoBA from "../../../resources/LogoBA-xs.png";

import EditProviderList from "./EditProviderList";
import FormGroup from "./FormGroup";
import FormInput from "./FormInput";
import PaymentSection from "../../PaymentSection";
import { Auth0Context } from "../../Auth/react-auth0-wrapper";

class SignupForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      nit: "",
      name: "",
      typeOfService: "",
      yearOfCreation: "",
      webPageURL: "",
      logoURL: "",
      providers: [],
      businessList: [],
      selectedBusiness: {},
      isEditPage: true
    };
  }

  static contextType = Auth0Context;

  componentDidMount() {
    const { profile, hasAProfile } = this.context;
    if (hasAProfile && profile) {
      this.setState(prevState => ({
        ...prevState,
        nit: profile.NIT,
        name: profile.name,
        typeOfService: profile.typeOfService,
        yearOfCreation: profile.yearOfCreation,
        webPageURL: profile.webPage,
        logoURL: profile.logo,
        allServices: profile.services
      }));
    }

    const isEditPage = this.props.match && this.props.match.path === EDIT;
    const url = isEditPage
      ? `${BASE_LOCAL_ENDPOINT}/business/${profile._id}?other=true`
      : `${BASE_LOCAL_ENDPOINT}/business/`;

    Axios.get(`${BASE_LOCAL_ENDPOINT}/business/${profile._id}?other=true`)
      .then(response => {
        const sortedData = response.data.sort((a, b) => b.name - a.name);
        const services =
          isEditPage &&
          profile.services &&
          profile.services.servicesAsContractor;

        let businessList = sortedData.map(business => {
          return {
            ...business,
            deleteProvider: this.deleteProvider,
            handleChange: this.handleChange
          };
        });

        if (isEditPage) {
          businessList = this.changeAdded(
            services.map(service => service.providerId),
            true,
            businessList
          ).map(business => {
            const service = services.find(
              service => business._id === service.providerId
            );
            return {
              ...business,
              contract: service ? service.contract : undefined,
              contractorId: service ? service.contractorId : undefined,
              providerId: service ? service.providerId : undefined,
              receivedTypeOfService: service
                ? service.typeOfService
                : undefined,
              serviceId: service ? service._id : undefined
            };
          });
        }

        this.setState(prevState => {
          return {
            ...prevState,
            isEditPage,
            businessList,
            selectedBusiness: sortedData.find(business => !business.added)
          };
        });
      })
      .catch(error => {
        // handle error
        console.error(error);
        this.setState(prevState => {
          return {
            ...prevState,
            error: error.message
          };
        });
      });
  }

  handleChange = (e, field, businessId) => {
    var value = e.target.value;
    if (businessId) {
      this.setState(prevState => {
        return {
          ...prevState,
          businessList: [
            ...prevState.businessList.map(business => {
              return business._id === businessId
                ? { ...business, [field]: value }
                : business;
            })
          ]
        };
      });
    } else {
      this.setState(prevState => {
        return {
          ...prevState,
          [field]: value
        };
      });
    }
  };

  signUp = async e => {
    e.preventDefault();
    const {
      name,
      typeOfService,
      yearOfCreation,
      webPageURL,
      logoURL,
      nit,
      businessList
    } = this.state;
    const { user, setHasAProfile, setProfile } = this.context;

    const newProfile = {
      NIT: nit,
      email: user.email,
      name: name,
      typeOfService: typeOfService,
      yearOfCreation: yearOfCreation,
      webPage: webPageURL,
      logo: logoURL
    };

    const responseBusiness = await Axios.post(
      `${BASE_LOCAL_ENDPOINT}/business`,
      newProfile
    );

    const profileData =
      responseBusiness &&
      responseBusiness.data &&
      responseBusiness.data.ops.length !== 0 &&
      responseBusiness.data.ops[0];

    const services = [
      ...businessList
        .filter(
          business =>
            business.added &&
            business.contract &&
            business.receivedTypeOfService
        )
        .map(business => {
          return {
            providerId: business._id,
            contractorId: profileData._id,
            contract: business.contract,
            typeOfService: business.receivedTypeOfService,
            validContract: false
          };
        })
    ];

    const responseServices = await Axios.post(
      `${BASE_LOCAL_ENDPOINT}/services`,
      services
    );

    const servicesData =
      responseServices &&
      responseServices.data &&
      responseServices.data.ops.length !== 0 &&
      responseServices.data.ops[0];
    setProfile({ ...profileData, ...servicesData });
    setHasAProfile(true);
  };

  editProfile = async e => {
    e.preventDefault();
    const {
      name,
      typeOfService,
      yearOfCreation,
      webPageURL,
      logoURL,
      nit,
      businessList
    } = this.state;
    const { user, setHasAProfile, setProfile, profile } = this.context;

    const newProfile = {
      NIT: nit,
      email: user.email,
      name: name,
      typeOfService: typeOfService,
      yearOfCreation: yearOfCreation,
      webPage: webPageURL,
      logo: logoURL
    };

    const responseBusiness = await Axios.patch(
      `${BASE_LOCAL_ENDPOINT}/business/${profile._id}`,
      newProfile
    );

    const profileData =
      responseBusiness && responseBusiness.data && responseBusiness.data.value;

    const services = [
      ...businessList
        .filter(
          business =>
            business.added &&
            business.contract &&
            business.receivedTypeOfService
        )
        .map(business => {
          return {
            providerId: business._id,
            contractorId: profile._id,
            contract: business.contract,
            typeOfService: business.receivedTypeOfService,
            validContract: false,
            _id: business.serviceId
          };
        })
    ];

    const responseServices = await Promise.all(
      services.map(service =>
        Axios.patch(`${BASE_LOCAL_ENDPOINT}/services/${service._id}`, {
          contract: service.contract,
          contractorId: service.contractorId,
          providerId: service.providerId,
          typeOfService: service.typeOfService
        })
      )
    );

    setProfile(profileData);
    setHasAProfile(true);
  };

  handleSelectChange = e => {
    const value = e.target.value;
    this.setState(prevState => {
      if (value)
        return {
          ...prevState,
          selectedBusiness: {
            ...prevState.businessList.find(business => business._id === value)
          }
        };
      else return prevState;
    });
  };

  changeAdded(ids, value, list) {
    const businessList = list ? list : this.state.businessList;

    return businessList.map(business => {
      const isIdInList = ids.find(id => id === business._id);
      return business._id === isIdInList
        ? { ...business, added: value ? value : !business.added }
        : business;
    });
  }
  addProvider = e => {
    e.preventDefault();

    this.setState(prevState => {
      if (
        Object.keys(prevState.selectedBusiness).length !== 0 &&
        prevState.selectedBusiness._id !== -1
      ) {
        const newBusinessList = this.changeAdded(
          [prevState.selectedBusiness._id],
          true
        );

        return {
          ...prevState,
          businessList: [...newBusinessList],
          selectedBusiness: {
            ...newBusinessList.find(business => !business.added)
          }
        };
      } else return prevState;
    });
  };

  deleteProvider = id => {
    this.setState(prevState => {
      const newBusinessList = this.changeAdded([id], false);
      return {
        ...prevState,
        businessList: [...newBusinessList],
        selectedBusiness: {
          ...newBusinessList.find(business => !business.added)
        }
      };
    });
  };

  render() {
    const {
      businessList,
      nit,
      name,
      typeOfService,
      yearOfCreation,
      webPageURL,
      logoURL,
      isEditPage
    } = this.state;
    console.log(businessList);

    return (
      <div className="signup">
        <form
          className="form"
          onSubmit={isEditPage ? this.editProfile : this.signUp}
        >
          <div className="form_header">
            <h1 className="form_header_title">
              {isEditPage ? "Editar Perfil" : "¡Registrate Ahora!"}
            </h1>
            <img className="form_header_logo" src={LogoBA} alt="Profile" />
          </div>

          <div className="form_body">
            <FormGroup inputId="nit" label="NIT">
              <FormInput
                type="number"
                placeholder="NIT"
                inputId="nit"
                onInputChange={this.handleChange}
                value={nit}
              />
            </FormGroup>

            <FormGroup inputId="name" label="Nombre de la empresa">
              <FormInput
                type="text"
                placeholder="Nombre"
                inputId="name"
                onInputChange={this.handleChange}
                value={name}
              />
            </FormGroup>

            <FormGroup
              inputId="typeOfService"
              label="Tipo de servicio que ofrece la empresa"
            >
              <FormInput
                type="text"
                placeholder="Tipo de servicio"
                inputId="typeOfService"
                onInputChange={this.handleChange}
                value={typeOfService}
              />
            </FormGroup>

            <FormGroup inputId="yearOfCreation" label="Año de fundación">
              <FormInput
                type="number"
                placeholder="Año"
                inputId="yearOfCreation"
                onInputChange={this.handleChange}
                min="1900"
                max="2099"
                step="1"
                value={yearOfCreation}
              />
            </FormGroup>

            <FormGroup inputId="webPageURL" label="Sitio web de la empresa">
              <FormInput
                type="url"
                placeholder="http://www.example.com"
                inputId="webPageURL"
                onInputChange={this.handleChange}
                value={webPageURL}
              />
            </FormGroup>

            <FormGroup
              inputId="logoURL"
              label="Dirección URL de la imagen de el logo de la empresa"
            >
              <FormInput
                type="url"
                placeholder="URL a la página web"
                inputId="logoURL"
                onInputChange={this.handleChange}
                value={logoURL}
              />
            </FormGroup>

            <FormGroup inputId="selectedBusiness" label="Agregar proveedores">
              <select
                className="form_group_input"
                id="selectedBusiness"
                onChange={e => this.handleSelectChange(e)}
                onBlur={e => this.handleSelectChange(e)}
                value={this.state.selectedBusiness._id}
              >
                <option disabled value="-1">
                  Seleccione una opcion
                </option>
                {this.state.businessList
                  .filter(business => !business.added)
                  .map(bussines => (
                    <option key={bussines._id} value={bussines._id}>
                      {bussines.name}
                    </option>
                  ))}
              </select>
              <button
                className="submit_button"
                id="add_provider_button"
                onClick={e => this.addProvider(e)}
              >
                Agregar
              </button>
              <EditProviderList
                providers={businessList.filter(business => business.added)}
              />
            </FormGroup>

            <input
              className="submit_button"
              id="submit_button"
              type="submit"
              value={isEditPage ? "Editar" : "Registrarse"}
            />
          </div>
        </form>
        {!isEditPage && <PaymentSection />}
      </div>
    );
  }
}

export default SignupForm;
