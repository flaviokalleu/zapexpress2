import React, { useEffect, useState } from "react";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormHelperText from "@material-ui/core/FormHelperText";
import TextField from "@material-ui/core/TextField";
import Title from "../Title";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import useSettings from "../../hooks/useSettings";
import { ToastContainer, toast } from 'react-toastify';
import { makeStyles } from "@material-ui/core/styles";
import { grey, blue } from "@material-ui/core/colors";
import { Tabs, Tab } from "@material-ui/core";
import OnlyForSuperUser from '../../components/OnlyForSuperUser';
import useAuth from '../../hooks/useAuth.js';

import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";

import api from "../../services/api";

// Importa componente Button para o botão de registrar webhook
import Button from "@material-ui/core/Button"; 
 
const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 240,
  },
  tab: {
    backgroundColor: theme.palette.options,  //DARK MODE PLW DESIGN//
    borderRadius: 4,
    width: "100%",
    "& .MuiTab-wrapper": {
      color: theme.palette.fontecor,
    },   //DARK MODE PLW DESIGN//
    "& .MuiTabs-flexContainer": {
      justifyContent: "center"
    }


  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
  },
  cardAvatar: {
    fontSize: "55px",
    color: grey[500],
    backgroundColor: "#ffffff",
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: {
    fontSize: "18px",
    color: blue[700],
  },
  cardSubtitle: {
    color: grey[600],
    fontSize: "14px",
  },
  alignRight: {
    textAlign: "right",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
  webhookButton: { // Estilo para o botão de registrar webhook
    marginTop: theme.spacing(2),
  },
}));

export default function Options(props) {
  const { settings, scheduleTypeChanged } = props;
  const classes = useStyles();

  const [currentUser, setCurrentUser] = useState({});
  const { getCurrentUserInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    async function findData() {
      setLoading(true);
      try {
        const user = await getCurrentUserInfo();
        setCurrentUser(user);
      } catch (e) {
        toast.error(e);
      }
      setLoading(false);
    }
    findData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSuper = () => {
    return currentUser.super;
  }; 

  const [userRating, setUserRating] = useState("disabled");
  const [scheduleType, setScheduleType] = useState("disabled");
  const [callType, setCallType] = useState("enabled");
  const [chatbotType, setChatbotType] = useState("");
  const [CheckMsgIsGroup, setCheckMsgIsGroupType] = useState("enabled");

  const [loadingUserRating, setLoadingUserRating] = useState(false);
  const [loadingScheduleType, setLoadingScheduleType] = useState(false);
  const [loadingCallType, setLoadingCallType] = useState(false);
  const [loadingChatbotType, setLoadingChatbotType] = useState(false);
  const [loadingCheckMsgIsGroup, setCheckMsgIsGroup] = useState(false);


  const [viewclosed, setviewclosed] = useState('disabled');
  const [loadingviewclosed, setLoadingviewclosed] = useState(false);

  const [viewgroups, setviewgroups] = useState('disabled');
  const [loadingviewgroups, setLoadingviewgroups] = useState(false);

  const [HubNotificaMeType, setHubNotificaMeType] = useState("");
  const [loadingHubNotificaMeType, setLoadingHubNotificaMeType] = useState(false);    

  const [ipixcType, setIpIxcType] = useState("");
  const [loadingIpIxcType, setLoadingIpIxcType] = useState(false);
  const [tokenixcType, setTokenIxcType] = useState("");
  const [loadingTokenIxcType, setLoadingTokenIxcType] = useState(false);

  const [ipmkauthType, setIpMkauthType] = useState("");
  const [loadingIpMkauthType, setLoadingIpMkauthType] = useState(false);
  const [clientidmkauthType, setClientIdMkauthType] = useState("");
  const [loadingClientIdMkauthType, setLoadingClientIdMkauthType] = useState(false);
  const [clientsecretmkauthType, setClientSecrectMkauthType] = useState("");
  const [loadingClientSecrectMkauthType, setLoadingClientSecrectMkauthType] = useState(false);

  const [showToken, setShowToken] = useState(false);
  const toggleShowToken = () => setShowToken(prev => !prev);

  const [asaasType, setAsaasType] = useState("");
  const [loadingAsaasType, setLoadingAsaasType] = useState(false);


  //EFI GERENCIANET

  /*const [gerencianetSandbox, setGerencianetSandbox] = useState("false");
  const [loadingGerencianetSandbox, setLoadingGerencianetSandbox] = useState(false);*/
  const [gerencianetClientId, setGerencianetClientId] = useState("");
  const [loadingGerencianetClientId, setLoadingGerencianetClientId] = useState(false);
  const [gerencianetClientSecret, setGerencianetClientSecret] = useState("");
  const [loadingGerencianetClientSecret, setLoadingGerencianetClientSecret] = useState(false);
  const [gerencianetPixKey, setGerencianetPixKey] = useState("");
  const [loadingGerencianetPixKey, setLoadingGerencianetPixKey] = useState(false);
  const [gerencianetPixCert, setGerencianetPixCert] = useState(null);
  const [loadingGerencianetPixCert, setLoadingGerencianetPixCert] = useState(false);

  
  // recursos a mais...
  const [trial, settrial] = useState('7');
  const [loadingtrial, setLoadingtrial] = useState(false);

  const [viewregister, setviewregister] = useState('disabled');
  const [loadingviewregister, setLoadingviewregister] = useState(false);

  const [allowregister, setallowregister] = useState('disabled');
  const [loadingallowregister, setLoadingallowregister] = useState(false);

  const [SendGreetingAccepted, setSendGreetingAccepted] = useState("disabled");
  const [loadingSendGreetingAccepted, setLoadingSendGreetingAccepted] = useState(false);
  
  const [SettingsTransfTicket, setSettingsTransfTicket] = useState("disabled");
  const [loadingSettingsTransfTicket, setLoadingSettingsTransfTicket] = useState(false);
  
  const [sendGreetingMessageOneQueues, setSendGreetingMessageOneQueues] = useState("disabled");
  const [loadingSendGreetingMessageOneQueues, setLoadingSendGreetingMessageOneQueues] = useState(false);


  // Adicionado para gerenciar configurações de e-mail na tabela Settings
  const [mailHost, setMailHost] = useState("");
  const [loadingMailHost, setLoadingMailHost] = useState(false);
  const [mailUser, setMailUser] = useState("");
  const [loadingMailUser, setLoadingMailUser] = useState(false);
  const [mailPass, setMailPass] = useState("");
  const [loadingMailPass, setLoadingMailPass] = useState(false);
  const [mailFrom, setMailFrom] = useState("");
  const [loadingMailFrom, setLoadingMailFrom] = useState(false);
  const [mailPort, setMailPort] = useState("");
  const [loadingMailPort, setLoadingMailPort] = useState(false);
  const [showMailPass, setShowMailPass] = useState(false);
  const toggleShowMailPass = () => setShowMailPass(prev => !prev);
  // Fim da adição para configurações de e-mail

  // Estado para controlar carregamento do webhook
  const [loadingWebhook, setLoadingWebhook] = useState(false); 

  const { update } = useSettings();

  useEffect(() => {
    if (Array.isArray(settings) && settings.length) {
      const userRating = settings.find((s) => s.key === "userRating");
      if (userRating) {
        setUserRating(userRating.value);
      }
      const scheduleType = settings.find((s) => s.key === "scheduleType");
      if (scheduleType) {
        setScheduleType(scheduleType.value);
      }
      const callType = settings.find((s) => s.key === "call");
      if (callType) {
        setCallType(callType.value);
      }
      const CheckMsgIsGroup = settings.find((s) => s.key === "CheckMsgIsGroup");
      if (CheckMsgIsGroup) {
        setCheckMsgIsGroupType(CheckMsgIsGroup.value);
      }

      const allowregister = settings.find((s) => s.key === 'allowregister');
      if (allowregister) {
        setallowregister(allowregister.value);
      }

      const viewclosed = settings.find((s) => s.key === 'viewclosed');
      if (viewclosed) {
        setviewclosed(viewclosed.value);
      }

      const viewgroups = settings.find((s) => s.key === 'viewgroups');
      if (viewgroups) {
        setviewgroups(viewgroups.value);
      }
      
	  {/*PLW DESIGN SAUDAÇÃO*/}
      const SendGreetingAccepted = settings.find((s) => s.key === "sendGreetingAccepted");
      if (SendGreetingAccepted) {
        setSendGreetingAccepted(SendGreetingAccepted.value);
      }	 
	  {/*PLW DESIGN SAUDAÇÃO*/}	 
	  
	  {/*TRANSFERIR TICKET*/}	
	  const SettingsTransfTicket = settings.find((s) => s.key === "sendMsgTransfTicket");
      if (SettingsTransfTicket) {
        setSettingsTransfTicket(SettingsTransfTicket.value);
      }
	  {/*TRANSFERIR TICKET*/}


      const viewregister = settings.find((s) => s.key === 'viewregister');
      if (viewregister) {
        setviewregister(viewregister.value);
      }

      const sendGreetingMessageOneQueues = settings.find((s) => s.key === "sendGreetingMessageOneQueues");
      if (sendGreetingMessageOneQueues) {
        setSendGreetingMessageOneQueues(sendGreetingMessageOneQueues.value)
      }	  
	  
      const chatbotType = settings.find((s) => s.key === "chatBotType");
      if (chatbotType) {
        setChatbotType(chatbotType.value);
      }
	  
      const trial = settings.find((s) => s.key === 'trial');
      if (trial) {
        settrial(trial.value);
      }

      const HubNotificaMeType = settings.find((s) => s.key === "hubToken");
      if (HubNotificaMeType) {
        setHubNotificaMeType(HubNotificaMeType.value);
      }

      const ipixcType = settings.find((s) => s.key === "ipixc");
      if (ipixcType) {
        setIpIxcType(ipixcType.value);
      }

      const tokenixcType = settings.find((s) => s.key === "tokenixc");
      if (tokenixcType) {
        setTokenIxcType(tokenixcType.value);
      }

      const ipmkauthType = settings.find((s) => s.key === "ipmkauth");
      if (ipmkauthType) {
        setIpMkauthType(ipmkauthType.value);
      }

      const clientidmkauthType = settings.find((s) => s.key === "clientidmkauth");
      if (clientidmkauthType) {
        setClientIdMkauthType(clientidmkauthType.value);
      }

      const clientsecretmkauthType = settings.find((s) => s.key === "clientsecretmkauth");
      if (clientsecretmkauthType) {
        setClientSecrectMkauthType(clientsecretmkauthType.value);
      }

      const asaasType = settings.find((s) => s.key === "asaas");
      if (asaasType) {
        setAsaasType(asaasType.value);
      }

      //EFI GERENCIANET

      const gerencianetClientId = settings.find((s) => s.key === "gerencianet_client_id");
      if (gerencianetClientId) {
        setGerencianetClientId(gerencianetClientId.value);
      }
      const gerencianetClientSecret = settings.find((s) => s.key === "gerencianet_client_secret");
      if (gerencianetClientSecret) {
        setGerencianetClientSecret(gerencianetClientSecret.value);
      }
      const gerencianetPixKey = settings.find((s) => s.key === "gerencianet_pix_key");
      if (gerencianetPixKey) {
        setGerencianetPixKey(gerencianetPixKey.value);
      }
      const gerencianetPixCertPath = settings.find((s) => s.key === "gerencianet_pix_cert_path");
      if (gerencianetPixCertPath) {
        setGerencianetPixCert(gerencianetPixCertPath.value);
      }

      // Adicionado para carregar configurações de e-mail da tabela Settings
      const mailHost = settings.find((s) => s.key === "mail_host");
      if (mailHost) {setMailHost(mailHost.value);}
      const mailUser = settings.find((s) => s.key === "mail_user");
      if (mailUser) {setMailUser(mailUser.value);}
      const mailPass = settings.find((s) => s.key === "mail_pass");
      if (mailPass) {setMailPass(mailPass.value);}
      const mailFrom = settings.find((s) => s.key === "mail_from");
      if (mailFrom) {setMailFrom(mailFrom.value);}
      const mailPort = settings.find((s) => s.key === "mail_port");
      if (mailPort) {setMailPort(mailPort.value);}
      // Fim da adição para configurações de e-mail
    }
  }, [settings]);

  async function handleChangeUserRating(value) {
    setUserRating(value);
    setLoadingUserRating(true);
    await update({
      key: "userRating",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingUserRating(false);
  }

  async function handleallowregister(value) {
    setallowregister(value);
    setLoadingallowregister(true);
    await update({
      key: 'allowregister',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingallowregister(false);
  }
 
  
  async function handleviewclosed(value) {
    setviewclosed(value);
    setLoadingviewclosed(true);
    await update({
      key: 'viewclosed',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingviewclosed(false);
  }

  async function handleviewgroups(value) {
    setviewgroups(value);
    setLoadingviewgroups(true);
    await update({
      key: 'viewgroups',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingviewgroups(false);
  }
    async function handleSendGreetingMessageOneQueues(value) {
    setSendGreetingMessageOneQueues(value);
    setLoadingSendGreetingMessageOneQueues(true);
    await update({
      key: "sendGreetingMessageOneQueues",
      value,
    });
	toast.success("Operação atualizada com sucesso.");
    setLoadingSendGreetingMessageOneQueues(false);
  }

  async function handleviewregister(value) {
    setviewregister(value);
    setLoadingviewregister(true);
    await update({
      key: 'viewregister',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingviewregister(false);
  }
  
    async function handletrial(value) {
    settrial(value);
    setLoadingtrial(true);
    await update({
      key: 'trial',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingtrial(false);
  }


  async function handleScheduleType(value) {
    setScheduleType(value);
    setLoadingScheduleType(true);
    await update({
      key: "scheduleType",
      value,
    });
    //toast.success("Oraçãpeo atualizada com sucesso.");
    toast.success('Operação atualizada com sucesso.', {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      theme: "light",
      });
    setLoadingScheduleType(false);
    if (typeof scheduleTypeChanged === "function") {
      scheduleTypeChanged(value);
    }
  }

  async function handleCallType(value) {
    setCallType(value);
    setLoadingCallType(true);
    await update({
      key: "call",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingCallType(false);
  }

  async function handleChatbotType(value) {
    setChatbotType(value);
    setLoadingChatbotType(true);
    await update({
      key: "chatBotType",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingChatbotType(false);
  }

  async function handleGroupType(value) {
    setCheckMsgIsGroupType(value);
    setCheckMsgIsGroup(true);
    await update({
      key: "CheckMsgIsGroup",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setCheckMsgIsGroupType(false);
  }
  
  {/*NOVO CÓDIGO*/}  
  async function handleSendGreetingAccepted(value) {
    setSendGreetingAccepted(value);
    setLoadingSendGreetingAccepted(true);
    await update({
      key: "sendGreetingAccepted",
      value,
    });
	toast.success("Operação atualizada com sucesso.");
    setLoadingSendGreetingAccepted(false);
  }  
  
  
  {/*NOVO CÓDIGO*/}    

  async function handleSettingsTransfTicket(value) {
    setSettingsTransfTicket(value);
    setLoadingSettingsTransfTicket(true);
    await update({
      key: "sendMsgTransfTicket",
      value,
    });

    toast.success("Operação atualizada com sucesso.");
    setLoadingSettingsTransfTicket(false);
  }

  async function handleChangeHubNotificaMe(value) {
    setHubNotificaMeType(value);
    setLoadingHubNotificaMeType(true);
    await update({
      key: "hubToken",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingHubNotificaMeType(false);
  } 
 
  async function handleChangeIPIxc(value) {
    setIpIxcType(value);
    setLoadingIpIxcType(true);
    await update({
      key: "ipixc",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingIpIxcType(false);
  }

  async function handleChangeTokenIxc(value) {
    setTokenIxcType(value);
    setLoadingTokenIxcType(true);
    await update({
      key: "tokenixc",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingTokenIxcType(false);
  }


  async function handleChangeIpMkauth(value) {
    setIpMkauthType(value);
    setLoadingIpMkauthType(true);
    await update({
      key: "ipmkauth",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingIpMkauthType(false);
  }

  async function handleChangeClientIdMkauth(value) {
    setClientIdMkauthType(value);
    setLoadingClientIdMkauthType(true);
    await update({
      key: "clientidmkauth",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingClientIdMkauthType(false);
  }

  async function handleChangeClientSecrectMkauth(value) {
    setClientSecrectMkauthType(value);
    setLoadingClientSecrectMkauthType(true);
    await update({
      key: "clientsecretmkauth",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingClientSecrectMkauthType(false);
  }

  async function handleChangeAsaas(value) {
    setAsaasType(value);
    setLoadingAsaasType(true);
    await update({
      key: "asaas",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingAsaasType(false);
  }



  //EFI GERENCIANET

  async function handleChangeGerencianetClientId(value) {
    setGerencianetClientId(value);
    setLoadingGerencianetClientId(true);
    await update({
      key: "gerencianet_client_id",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingGerencianetClientId(false);
  }

  async function handleChangeGerencianetClientSecret(value) {
    setGerencianetClientSecret(value);
    setLoadingGerencianetClientSecret(true);
    await update({
      key: "gerencianet_client_secret",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingGerencianetClientSecret(false);
  }

  async function handleChangeGerencianetPixKey(value) {
    setGerencianetPixKey(value);
    setLoadingGerencianetPixKey(true);
    await update({
      key: "gerencianet_pix_key",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingGerencianetPixKey(false);
  }

  async function handleChangeGerencianetPixCert(event) {
    const file = event.target.files[0];
    if (file) {
      setGerencianetPixCert(file.name);
      setLoadingGerencianetPixCert(true);
      const formData = new FormData();
      formData.append("certFile", file);
      try {
        const response = await api.post(`/settings/upload-gerencianet-cert`, formData);
        if (response.status === 200 && response.data.mensagem === "Arquivo Anexado") {
          toast.success("Certificado salvo com sucesso.");
        } else {
          console.log("Resposta inesperada do backend:", response.data);
          toast.error("Erro ao fazer upload do certificado - 1.");
        }
      } catch (error) {
        console.log("Erro no upload do certificado:", error);
        toast.error("Erro ao fazer upload do certificado - 2.");
      }
      setLoadingGerencianetPixCert(false);
    }
  }

  // Adicionado para manipular configurações de e-mail e salvar na tabela Settings
  async function handleChangeMailHost(value) {
    setMailHost(value);
    setLoadingMailHost(true);
    await update({ key: "mail_host", value });
    toast.success("Operação atualizada com sucesso.");
    setLoadingMailHost(false);
  }

  async function handleChangeMailUser(value) {
    setMailUser(value);
    setLoadingMailUser(true);
    await update({ key: "mail_user", value });
    toast.success("Operação atualizada com sucesso.");
    setLoadingMailUser(false);
  }

  async function handleChangeMailPass(value) {
    setMailPass(value);
    setLoadingMailPass(true);
    await update({ key: "mail_pass", value });
    toast.success("Operação atualizada com sucesso.");
    setLoadingMailPass(false);
  }

  async function handleChangeMailFrom(value) {
    setMailFrom(value);
    setLoadingMailFrom(true);
    await update({ key: "mail_from", value });
    toast.success("Operação atualizada com sucesso.");
    setLoadingMailFrom(false);
  }

  async function handleChangeMailPort(value) {
    setMailPort(value);
    setLoadingMailPort(true);
    await update({ key: "mail_port", value });
    toast.success("Operação atualizada com sucesso.");
    setLoadingMailPort(false);
  }
  // Fim da adição para configurações de e-mail

  // Função para registrar o webhook da Efí Gerencianet
  async function handleRegisterWebhook() {
    setLoadingWebhook(true);
    try {
      const response = await api.post("/efi/register-webhook");
      if (response.data.status === 200) {
        toast.success("Webhook registrado com sucesso.");
      } else {
        toast.error(response.data.message || "Erro ao registrar webhook.");
      }
    } catch (error) {
      toast.error("Erro ao registrar webhook: " + error.message);
    }
    setLoadingWebhook(false);
  }

  // Valida se as credenciais da Efí estão preenchidas
  const isEfiCredentialsValid = gerencianetClientId && gerencianetClientSecret && gerencianetPixKey;
    
  return (
    <>
      <Grid spacing={3} container>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="ratings-label">Avaliações</InputLabel>
            <Select
              labelId="ratings-label"
              value={userRating}
              onChange={async (e) => {
                handleChangeUserRating(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>Desabilitadas</MenuItem>
              <MenuItem value={"enabled"}>Habilitadas</MenuItem>
            </Select>
            <FormHelperText>
              {loadingUserRating && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="schedule-type-label">
              Gerenciamento de Expediente
            </InputLabel>
            <Select
              labelId="schedule-type-label"
              value={scheduleType}
              onChange={async (e) => {
                handleScheduleType(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>Desabilitado</MenuItem>
              <MenuItem value={"queue"}>Fila</MenuItem>
              <MenuItem value={"company"}>Empresa</MenuItem>
            </Select>
            <FormHelperText>
              {loadingScheduleType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="group-type-label">
              Ignorar Mensagens de Grupos
            </InputLabel>
            <Select
              labelId="group-type-label"
              value={CheckMsgIsGroup}
              onChange={async (e) => {
                handleGroupType(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>Desativado</MenuItem>
              <MenuItem value={"enabled"}>Ativado</MenuItem>
            </Select>
            <FormHelperText>
              {loadingScheduleType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="call-type-label">
              Aceitar Chamada
            </InputLabel>
            <Select
              labelId="call-type-label"
              value={callType}
              onChange={async (e) => {
                handleCallType(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>Não Aceitar</MenuItem>
              <MenuItem value={"enabled"}>Aceitar</MenuItem>
            </Select>
            <FormHelperText>
              {loadingCallType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
       <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="chatbot-type-label">
              Tipo Chatbot
            </InputLabel>
            <Select
              labelId="chatbot-type-label"
              value={chatbotType}
              onChange={async (e) => {
                handleChatbotType(e.target.value);
              }}
            >
              <MenuItem value={"text"}>Texto</MenuItem>
            </Select>
            <FormHelperText>
              {loadingChatbotType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
		{/* ENVIAR SAUDAÇÃO AO ACEITAR O TICKET */}
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="sendGreetingAccepted-label">Enviar saudação ao aceitar o ticket</InputLabel>
            <Select
              labelId="sendGreetingAccepted-label"
              value={SendGreetingAccepted}
              onChange={async (e) => {
                handleSendGreetingAccepted(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>Desabilitado</MenuItem>
              <MenuItem value={"enabled"}>Habilitado</MenuItem>
            </Select>
            <FormHelperText>
              {loadingSendGreetingAccepted && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
		{/* ENVIAR SAUDAÇÃO AO ACEITAR O TICKET */}
		
		{/* ENVIAR MENSAGEM DE TRANSFERENCIA DE SETOR/ATENDENTE */}
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="sendMsgTransfTicket-label">Enviar mensagem de transferencia de Fila/agente</InputLabel>
            <Select
              labelId="sendMsgTransfTicket-label"
              value={SettingsTransfTicket}
              onChange={async (e) => {
                handleSettingsTransfTicket(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>Desabilitado</MenuItem>
              <MenuItem value={"enabled"}>Habilitado</MenuItem>
            </Select>
            <FormHelperText>
              {loadingSettingsTransfTicket && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
		
		{/* ENVIAR SAUDAÇÃO QUANDO HOUVER SOMENTE 1 FILA */}
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="sendGreetingMessageOneQueues-label">Enviar saudação quando houver somente 1 fila</InputLabel>
            <Select
              labelId="sendGreetingMessageOneQueues-label"
              value={sendGreetingMessageOneQueues}
              onChange={async (e) => {
                handleSendGreetingMessageOneQueues(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>Desabilitado</MenuItem>
              <MenuItem value={"enabled"}>Habilitado</MenuItem>
            </Select>
            <FormHelperText>
              {loadingSendGreetingMessageOneQueues && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id='viewclosed-label'>
              Operador Visualiza Tickets Fechados?
            </InputLabel>
            <Select
              labelId='viewclosed-label'
              value={viewclosed}
              onChange={async (e) => {
                handleviewclosed(e.target.value);
              }}
            >
              <MenuItem value={'disabled'}>Não</MenuItem>
              <MenuItem value={'enabled'}>Sim</MenuItem>
            </Select>
            <FormHelperText>
              {loadingviewclosed && 'Atualizando...'}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id='viewgroups-label'>
              Operador Visualiza Grupos?
            </InputLabel>
            <Select
              labelId='viewgroups-label'
              value={viewgroups}
              onChange={async (e) => {
                handleviewgroups(e.target.value);
              }}
            >
              <MenuItem value={'disabled'}>Não</MenuItem>
              <MenuItem value={'enabled'}>Sim</MenuItem>
            </Select>
            <FormHelperText>
              {loadingviewgroups && 'Atualizando...'}
            </FormHelperText>
          </FormControl>
        </Grid>
		
      </Grid>
	  
		<OnlyForSuperUser
				user={currentUser}
				yes={() => (
				  <>
  					<Grid spacing={3} container>
  					  <Tabs
  						indicatorColor='primary'
  						textColor='primary'
  						scrollButtons='on'
  						variant='scrollable'
  						className={classes.tab}
  						style={{
  						  marginBottom: 20,
  						  marginTop: 20,
  						}}
  					  >
  						<Tab label='Configurações Globais' />
  					  </Tabs>
  					</Grid>


            <Grid xs={12} sm={12} md={12} item>
                <FormControl className={classes.selectContainer}>
                  <InputLabel id='allowregister-label'>
                    Registro (Inscrição) Permitida?
                  </InputLabel>
                  <Select
                    labelId='allowregister-label'
                    value={allowregister}
                    onChange={async (e) => {
                      handleallowregister(e.target.value);
                    }}
                  >
                    <MenuItem value={'disabled'}>Não</MenuItem>
                    <MenuItem value={'enabled'}>Sim</MenuItem>
                  </Select>
                  <FormHelperText>
                    {loadingallowregister && 'Atualizando...'}
                  </FormHelperText>
                </FormControl>
              </Grid>

    				  <Grid xs={12} sm={12} md={12} item>
                    <FormControl className={classes.selectContainer}>
                      <InputLabel id='viewregister-label'>
                        Registro (Inscrição) Visível?
                      </InputLabel>
                      <Select
                        labelId='viewregister-label'
                        value={viewregister}
                        onChange={async (e) => {
                          handleviewregister(e.target.value);
                        }}
                      >
                        <MenuItem value={'disabled'}>Não</MenuItem>
                        <MenuItem value={'enabled'}>Sim</MenuItem>
                      </Select>
                      <FormHelperText>
                        {loadingviewregister && 'Atualizando...'}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
			  
			                <Grid xs={12} sm={12} md={12} item>
                <FormControl className={classes.selectContainer}>
                  <InputLabel id='trial-label'>Tempo de Trial?</InputLabel>
                  <Select
                    labelId='trial-label'
                    value={trial}
                    onChange={async (e) => {
                      handletrial(e.target.value);
                    }}
                  >
                    <MenuItem value={'1'}>1</MenuItem>
                    <MenuItem value={'2'}>2</MenuItem>
                    <MenuItem value={'3'}>3</MenuItem>
                    <MenuItem value={'4'}>4</MenuItem>
                    <MenuItem value={'5'}>5</MenuItem>
                    <MenuItem value={'6'}>6</MenuItem>
                    <MenuItem value={'7'}>7</MenuItem>
                  </Select>
                  <FormHelperText>
                    {loadingtrial && 'Atualizando...'}
                  </FormHelperText>
                </FormControl>
              </Grid>

          </>
        )}
      />
	        <Grid spacing={3} container>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
          style={{
            marginBottom: 20,
            marginTop: 20
          }}
        >
          <Tab

            label="INTEGRAÇÕES" />

        </Tabs>

      </Grid>

      {/*-----------------HUB NOTIFICAME-----------------*/}
      <Grid spacing={3} container
        style={{ marginBottom: 10 }}>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab label="HUB NOTIFICAME" />

        </Tabs>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="HubNotificaMe"
              name="HubNotificaMe"
              margin="dense"
              label="Token Account"
              variant="outlined"
              value={HubNotificaMeType}
              type={showToken ? "text" : "password"}
              onChange={async (e) => {
                handleChangeHubNotificaMe(e.target.value);
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={toggleShowToken} edge="end">
                      {showToken ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            >

            </TextField>
            <FormHelperText>
              {loadingHubNotificaMeType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>

      {/*-----------------IXC-----------------*/}
      <Grid spacing={3} container
        style={{ marginBottom: 10 }}>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab

            label="IXC" />

        </Tabs>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="ipixc"
              name="ipixc"
              margin="dense"
              label="IP do IXC"
              variant="outlined"
              value={ipixcType}
              onChange={async (e) => {
                handleChangeIPIxc(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingIpIxcType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="tokenixc"
              name="tokenixc"
              margin="dense"
              label="Token do IXC"
              variant="outlined"
              value={tokenixcType}
              onChange={async (e) => {
                handleChangeTokenIxc(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingTokenIxcType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
      {/*-----------------MK-AUTH-----------------*/}
      <Grid spacing={3} container
        style={{ marginBottom: 10 }}>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab label="MK-AUTH" />

        </Tabs>
        <Grid xs={12} sm={12} md={4} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="ipmkauth"
              name="ipmkauth"
              margin="dense"
              label="Ip Mk-Auth"
              variant="outlined"
              value={ipmkauthType}
              onChange={async (e) => {
                handleChangeIpMkauth(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingIpMkauthType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={4} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="clientidmkauth"
              name="clientidmkauth"
              margin="dense"
              label="Client Id"
              variant="outlined"
              value={clientidmkauthType}
              onChange={async (e) => {
                handleChangeClientIdMkauth(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingClientIdMkauthType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={12} md={4} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="clientsecretmkauth"
              name="clientsecretmkauth"
              margin="dense"
              label="Client Secret"
              variant="outlined"
              value={clientsecretmkauthType}
              onChange={async (e) => {
                handleChangeClientSecrectMkauth(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingClientSecrectMkauthType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
      {/*-----------------ASAAS-----------------*/}
      <Grid spacing={3} container
        style={{ marginBottom: 10 }}>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab label="ASAAS" />

        </Tabs>
        <Grid xs={12} sm={12} md={12} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="asaas"
              name="asaas"
              margin="dense"
              label="Token Asaas"
              variant="outlined"
              value={asaasType}
              onChange={async (e) => {
                handleChangeAsaas(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingAsaasType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/*-----------------EFI GERENCIANET-----------------*/}
        <OnlyForSuperUser
          user={currentUser}
          yes={() => (
            <>
              <Grid spacing={3} container style={{ marginBottom: 10, maxWidth: "1400px", marginLeft: "auto", marginRight: "auto" }}>
                <Tabs
                  indicatorColor="primary"
                  textColor="primary"
                  scrollButtons="on"
                  variant="scrollable"
                  className={classes.tab}
                >
                  <Tab label="EFI GERENCIANET" />
                </Tabs>
                <Grid xs={12} sm={6} md={6} item>
                  <FormControl className={classes.selectContainer}>
                    <TextField
                      id="gerencianet_client_id"
                      name="gerencianet_client_id"
                      margin="dense"
                      label="Client ID"
                      variant="outlined"
                      value={gerencianetClientId}
                      onChange={async (e) => {
                        handleChangeGerencianetClientId(e.target.value);
                      }}
                    />
                    <FormHelperText>
                      {loadingGerencianetClientId && "Atualizando..."}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={6} item>
                  <FormControl className={classes.selectContainer}>
                    <TextField
                      id="gerencianet_client_secret"
                      name="gerencianet_client_secret"
                      margin="dense"
                      label="Client Secret"
                      variant="outlined"
                      value={gerencianetClientSecret}
                      onChange={async (e) => {
                        handleChangeGerencianetClientSecret(e.target.value);
                      }}
                    />
                    <FormHelperText>
                      {loadingGerencianetClientSecret && "Atualizando..."}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={6} item>
                  <FormControl className={classes.selectContainer}>
                    <TextField
                      id="gerencianet_pix_key"
                      name="gerencianet_pix_key"
                      margin="dense"
                      label="Chave PIX"
                      variant="outlined"
                      value={gerencianetPixKey}
                      onChange={async (e) => {
                        handleChangeGerencianetPixKey(e.target.value);
                      }}
                    />
                    <FormHelperText>
                      {loadingGerencianetPixKey && "Atualizando..."}
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={6} item>
                  <FormControl className={classes.selectContainer}>
                    <TextField
                      id="gerencianet_pix_cert"
                      name="gerencianet_pix_cert"
                      margin="dense"
                      label="Certificado PIX"
                      variant="outlined"
                      value={gerencianetPixCert || "Nenhum arquivo selecionado"}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                    <input
                      type="file"
                      accept=".p12"
                      onChange={handleChangeGerencianetPixCert}
                      style={{ marginTop: 8 }}
                    />
                    <FormHelperText>
                      {loadingGerencianetPixCert && "Atualizando..."}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                {/* Botão para registrar webhook */}
                 <Grid xs={12} sm={12} md={12} item>
                   <Button
                     variant="contained"
                     color="primary"
                     onClick={handleRegisterWebhook}
                     disabled={!isEfiCredentialsValid || loadingWebhook}
                     className={classes.webhookButton}
                   >
                     {loadingWebhook ? "Registrando..." : "Registrar Webhook Efí Gerencianet"}
                   </Button>
                 </Grid>
              </Grid>
            </>
          )}
        />

        <OnlyForSuperUser
          user={currentUser}
          yes={() => (
            <Grid spacing={3} container style={{ marginBottom: 10, maxWidth: "1400px", marginLeft: "auto", marginRight: "auto" }}>
              <Tabs
                indicatorColor="primary"
                textColor="primary"
                scrollButtons="on"
                variant="scrollable"
                className={classes.tab}
              >
                <Tab label="CONFIGURAÇÕES DE E-MAIL" />
              </Tabs>
              <Grid xs={12} sm={6} md={6} item>
                <FormControl className={classes.selectContainer}>
                  <TextField
                    id="mail_host"
                    name="mail_host"
                    margin="dense"
                    label="Host SMTP"
                    variant="outlined"
                    value={mailHost}
                    onChange={async (e) => handleChangeMailHost(e.target.value)}
                  />
                  <FormHelperText>{loadingMailHost && "Atualizando..."}</FormHelperText>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={6} item>
                <FormControl className={classes.selectContainer}>
                  <TextField
                    id="mail_user"
                    name="mail_user"
                    margin="dense"
                    label="Usuário SMTP"
                    variant="outlined"
                    value={mailUser}
                    onChange={async (e) => handleChangeMailUser(e.target.value)}
                  />
                  <FormHelperText>{loadingMailUser && "Atualizando..."}</FormHelperText>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={6} item>
                <FormControl className={classes.selectContainer}>
                  <TextField
                    id="mail_pass"
                    name="mail_pass"
                    margin="dense"
                    label="Senha SMTP"
                    variant="outlined"
                    value={mailPass}
                    type={showMailPass ? "text" : "password"}
                    onChange={async (e) => handleChangeMailPass(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={toggleShowMailPass} edge="end">
                            {showMailPass ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormHelperText>{loadingMailPass && "Atualizando..."}</FormHelperText>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={6} item>
                <FormControl className={classes.selectContainer}>
                  <TextField
                    id="mail_from"
                    name="mail_from"
                    margin="dense"
                    label="Remetente"
                    variant="outlined"
                    value={mailFrom}
                    onChange={async (e) => handleChangeMailFrom(e.target.value)}
                  />
                  <FormHelperText>{loadingMailFrom && "Atualizando..."}</FormHelperText>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={6} item>
                <FormControl className={classes.selectContainer}>
                  <TextField
                    id="mail_port"
                    name="mail_port"
                    margin="dense"
                    label="Porta SMTP"
                    variant="outlined"
                    value={mailPort}
                    onChange={async (e) => handleChangeMailPort(e.target.value)}
                  />
                  <FormHelperText>{loadingMailPort && "Atualizando..."}</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          )}
        />
      </Grid>
    </>
  );
}