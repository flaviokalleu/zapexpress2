import React, { useContext, useEffect, useRef, useState } from "react";

import clsx from "clsx";
import { format, isSameDay, parseISO } from "date-fns";
import { useHistory } from "react-router-dom";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Typography from "@material-ui/core/Typography";
import { green, grey, blue } from "@material-ui/core/colors";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";

import { Chip, Tooltip, IconButton } from "@material-ui/core";

import { v4 as uuidv4 } from "uuid";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";

import AndroidIcon from "@material-ui/icons/Android";
import ContactTag from "../ContactTag";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import { getInitials } from "../../helpers/getInitials";
import { generateColor } from "../../helpers/colorGenerator";

import FacebookIcon from "@material-ui/icons/Facebook";
import InstagramIcon from "@material-ui/icons/Instagram";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";

import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import CloseIcon from "@material-ui/icons/Close";
import SwapHorizIcon from "@material-ui/icons/SwapHoriz";
import ReplayIcon from "@material-ui/icons/Replay";

const useStyles = makeStyles((theme) => ({
  ticket: {
    position: "relative",
    height: "auto",
    minHeight: 60,
    padding: theme.spacing(0.5),
    transition: "background-color 0.3s",
    "&:hover": {
      backgroundColor: "#eeeeee",
    },
    "&.Mui-selected": {
      backgroundColor: "#D3D3D3",
      borderRight: "4px solid #3f3f3f",
    },
  },
  pendingTicket: {
    cursor: "unset",
  },
  queueTag: {
    background: "#FCFCFC",
    color: "#000",
    marginRight: 4,
    padding: "2px 5px",
    fontWeight: "bold",
    borderRadius: 3,
    fontSize: "0.6em",
    whiteSpace: "nowrap",
  },
  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  newMessagesCount: {
    // Mantido: Estilo para badge visível e alinhado
    display: "inline-flex",
    alignItems: "center",
    marginLeft: 4,
    borderRadius: 10,
    padding: "2px 6px",
    minWidth: 20,
    position: "relative",
    zIndex: 2,
  },
  connectionTag: {
    background: "green",
    color: "#FFF",
    marginRight: 4,
    padding: "2px 5px",
    fontWeight: "bold",
    borderRadius: 2,
    fontSize: "0.6em",
    whiteSpace: "nowrap",
  },
  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "12px",
    lineHeight: "1.4",
  },
  noTicketsTitle: {
    textAlign: "center",
    fontSize: "12px",
    fontWeight: "600",
    margin: "0px",
  },
  contactNameWrapper: {
    display: "flex",
    alignItems: "center",
    // Alteração: Remove justifyContent e mantém apenas o necessário para o nome
    margin: 0,
    padding: 0,
  },
  lastMessageTime: {
    justifySelf: "flex-end",
    textAlign: "right",
    position: "relative",
    top: -25,
    background: "#333333",
    color: "#ffffff",
    border: "1px solid #3a3b6c",
    borderRadius: 5,
    padding: "1px 5px",
    fontSize: "0.6em",
  },
  closedBadge: {
    alignSelf: "center",
    justifySelf: "flex-end",
    marginRight: 32,
    marginLeft: "auto",
  },
  contactLastMessage: {
    paddingRight: "0%",
    marginLeft: "0px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeStyle: {
    color: "white",
    backgroundColor: green[500],
  },
  acceptButton: {
    position: "absolute",
    left: "50%",
  },
  ticketQueueColor: {
    flex: "none",
    width: 6,
    height: "100%",
    position: "absolute",
    top: "0%",
    left: "0%",
  },
  ticketInfo: {
    position: "relative",
    top: -13,
  },
  secondaryContentSecond: {
    // Alteração: Força os ícones a ocuparem uma linha separada
    display: "block", // Garante uma nova linha
    marginTop: 2, // Pequena separação da última mensagem
    marginLeft: -5,
    paddingLeft: 0,
    overflow: "visible",
  },
  ticketInfo1: {
    position: "relative",
    top: 13,
    right: 0,
  },
  Radiusdot: {
    "& .MuiBadge-badge": {
      borderRadius: 2,
      position: "inherit",
      height: 16,
      margin: 2,
      padding: 3,
    },
    "& .MuiBadge-anchorOriginTopRightRectangle": {
      transform: "scale(1) translate(0%, -40%)",
    },
  },
  presence: {
    color: theme?.mode === "light" ? "blue" : "lightgreen",
    fontWeight: "bold",
  },
  listItemAvatar: {
    display: "flex",
    alignItems: "center",
    minWidth: 56,
    marginLeft: 8,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: "50%",
  },
  iconButton: {
    padding: 2,
    marginLeft: 2,
    color: "inherit",
    "&:hover": {
      backgroundColor: theme.palette.grey[200],
    },
  },
  acceptIcon: {
    color: green[500],
  },
  closeIcon: {
    color: "red",
  },
  transferIcon: {
    color: blue[500],
  },
  reopenIcon: {
    color: "red",
  },
}));

const TicketListItemCustom = ({ ticket }) => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [ticketUser, setTicketUser] = useState(null);
  const [ticketQueueName, setTicketQueueName] = useState(null);
  const [ticketQueueColor, setTicketQueueColor] = useState(null);
  const [tag, setTag] = useState([]);
  const [whatsAppName, setWhatsAppName] = useState(null);
  const [lastInteractionLabel, setLastInteractionLabel] = useState('');
  const { currentTicket, setCurrentTicket } = useContext(TicketsContext);
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);
  const { profile } = user;
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const presenceMessage = { composing: "Digitando...", recording: "Gravando..." };

  useEffect(() => {
    if (ticket.userId && ticket.user) {
      setTicketUser(ticket.user?.name?.toUpperCase());
    }
    setTicketQueueName(ticket.queue?.name?.toUpperCase());
    setTicketQueueColor(ticket.queue?.color);

    if (ticket.whatsappId && ticket.whatsapp) {
      setWhatsAppName(ticket.whatsapp.name?.toUpperCase());
    }

    setTag(ticket?.tags);

    return () => {
      isMounted.current = false;
    };
  }, [ticket]);

  const handleCloseTicket = async (id) => {
    setTag(ticket?.tags);
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "closed",
        userId: user?.id,
        queueId: ticket?.queue?.id,
        useIntegration: false,
        promptId: null,
        integrationId: null
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    history.push(`/tickets/`);
  };

  useEffect(() => {
    const renderLastInteractionLabel = () => {
      let labelColor = '';
      let labelText = '';

      if (!ticket.lastMessage) return '';

      const lastInteractionDate = parseISO(ticket.updatedAt);
      const currentDate = new Date();
      const timeDifference = currentDate - lastInteractionDate;
      const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
      const minutesDifference = Math.floor(timeDifference / (1000 * 60));

      if (minutesDifference >= 3 && minutesDifference <= 10) {
        labelText = `(${minutesDifference} m atrás)`;
        labelColor = 'green';
      } else if (minutesDifference >= 30 && minutesDifference < 60) {
        labelText = `(${minutesDifference} m atrás)`;
        labelColor = 'Orange';
      } else if (minutesDifference > 60 && hoursDifference < 24) {
        labelText = `(${hoursDifference} h atrás)`;
        labelColor = 'red';
      } else if (hoursDifference >= 24) {
        labelText = `(${Math.floor(hoursDifference / 24)} dias atrás)`;
        labelColor = 'red';
      }

      return { labelText, labelColor };
    };

    const updateLastInteractionLabel = () => {
      const { labelText, labelColor } = renderLastInteractionLabel();
      setLastInteractionLabel(
        <Badge
          className={classes.lastInteractionLabel}
          style={{ color: labelColor }}
        >
          {labelText}
        </Badge>
      );
      setTimeout(updateLastInteractionLabel, 30 * 1000);
    };

    updateLastInteractionLabel();
  }, [ticket, classes.lastInteractionLabel]);

  const handleReopenTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "open",
        userId: user?.id,
        queueId: ticket?.queue?.id
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    history.push(`/tickets/${ticket.uuid}`);
  };

  const handleAcepptTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "open",
        userId: user?.id,
      });
      
      let settingIndex;
      try {
        const { data } = await api.get("/settings/");
        settingIndex = data.filter((s) => s.key === "sendGreetingAccepted");
      } catch (err) {
        toastError(err);
      }
      
      if (settingIndex[0].value === "enabled" && !ticket.isGroup) {
        handleSendMessage(ticket.id);
      }
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    history.push(`/tickets/${ticket.uuid}`);
  };

  const handleSendMessage = async (id) => {
    const msg = `{{ms}} *{{name}}*, meu nome é *${user?.name}* e agora vou prosseguir com seu atendimento!`;
    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: `*Mensagem Automática:*\n${msg.trim()}`,
    };
    try {
      await api.post(`/messages/${id}`, message);
    } catch (err) {
      toastError(err);
    }
  };

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
    history.push(`/tickets/${uuid}`);
  };

  const renderTicketInfo = () => {
    if (ticketUser) {
      return (
        <>
          {ticket.chatbot && (
            <Tooltip title="Chatbot">
              <AndroidIcon
                fontSize="small"
                style={{ color: grey[700], marginRight: 5 }}
              />
            </Tooltip>
          )}
        </>
      );
    } else {
      return (
        <>
          {ticket.chatbot && (
            <Tooltip title="Chatbot">
              <AndroidIcon
                fontSize="small"
                style={{ color: grey[700], marginRight: 5 }}
              />
            </Tooltip>
          )}
        </>
      );
    }
  };

  const handleOpenTransferModal = () => {
    setTransferTicketModalOpen(true);
  };

  const handleCloseTransferTicketModal = () => {
    if (isMounted.current) {
      setTransferTicketModalOpen(false);
    }
  };

  return (
    <React.Fragment key={ticket.id}>
      <TransferTicketModalCustom
        modalOpen={transferTicketModalOpen}
        onClose={handleCloseTransferTicketModal}
        ticketid={ticket.id}
      />
      <ListItem
        dense
        button
        onClick={() => {
          handleSelectTicket(ticket);
        }}
        selected={currentTicket && currentTicket.id === ticket.id}
        className={clsx(classes.ticket, {
          [classes.pendingTicket]: ticket.status === "pending",
        })}
      >
        <Tooltip arrow placement="right" title={ticket.queue?.name?.toUpperCase() || "SEM FILA"} >
          <span style={{ backgroundColor: ticket.queue?.color || "#7C7C7C" }} className={classes.ticketQueueColor}></span> 
        </Tooltip>       
        <ListItemAvatar className={classes.listItemAvatar}>
          <Avatar
            className={classes.avatar}
            src={ticket?.contact?.profilePicUrl}
            style={{ backgroundColor: generateColor(ticket?.contact?.number) }}
          >
            {getInitials(ticket?.contact?.name || "")}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          disableTypography
          style={{ marginLeft: 0, paddingLeft: 0 }} // Mantido: Remove margens do ListItemText para alinhamento
          primary={
            <span className={classes.contactNameWrapper}>
              <Typography
                noWrap
                component='span'
                variant='body2'
                color='textPrimary'
              >
                <strong>{ticket.contact.name} {lastInteractionLabel}</strong>
                <ListItemSecondaryAction>
                  <Box className={classes.ticketInfo1}>{renderTicketInfo()}</Box>
                </ListItemSecondaryAction>
              </Typography>
            </span>
          }
          secondary={
            <>
              {/* Alteração: Última mensagem como elemento separado */}
              <Typography
                className={classes.contactLastMessage}
                noWrap
                component="span"
                variant="body2"
                color="textSecondary"
              >
                {["composing", "recording"].includes(ticket?.presence) ? (
                  <span className={classes.presence}>
                    {presenceMessage[ticket.presence]}
                  </span>
                ) : (
                  <>
                    {ticket.lastMessage.includes('data:image/png;base64') ? <MarkdownWrapper> Localização</MarkdownWrapper> : <MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>}
                  </>
                )}
              </Typography>
              {/* Alteração: Ícones em um Box separado para forçar nova linha */}
              <Box className={classes.secondaryContentSecond}>
                {/* Ícones de redes sociais */}
                {ticket?.contact?.messengerId || ticket?.contact?.instagramId || ticket?.contact?.number ? (
                  <>
                    {ticket?.contact?.messengerId && (
                      <Badge className={classes.connectionTag} style={{ backgroundColor: "transparent", boxShadow: "none" }}>
                        <FacebookIcon style={{ verticalAlign: "middle", color: "#1877F2" }} />
                      </Badge>
                    )}
                    {ticket?.contact?.instagramId && (
                      <Badge className={classes.connectionTag} style={{ backgroundColor: "transparent", boxShadow: "none" }}>
                        <InstagramIcon style={{ verticalAlign: "middle", color: "#E1306C" }} />
                      </Badge>
                    )}
                    {ticket?.contact?.number && (
                      <Badge className={classes.connectionTag} style={{ backgroundColor: "transparent", boxShadow: "none" }}>
                        <WhatsAppIcon style={{ verticalAlign: "middle", color: "#25D366" }} />
                      </Badge>
                    )}
                  </>
                ) : null}
                {/* Nome da conexão WhatsApp */}
                {ticket?.whatsapp?.name && (
                  <Badge className={classes.connectionTag}>
                    {ticket?.whatsapp?.name?.toUpperCase()}
                  </Badge>
                )}
                {/* Nome do usuário */}
                {ticketUser && (
                  <Badge style={{ backgroundColor: "#000000" }} className={classes.connectionTag}>
                    {ticketUser}
                  </Badge>
                )}
                {/* Nome da fila */}
                {ticket.queue?.name && (
                  <Badge style={{ backgroundColor: ticket.queue?.color || "#7c7c7c" }} className={classes.connectionTag}>
                    {ticket.queue?.name?.toUpperCase()}
                  </Badge>
                )}
                {/* Botões de ação */}
                {ticket.status === "pending" && (
                  <>
                    <Tooltip title={i18n.t("ticketsList.buttons.accept")}>
                      <IconButton
                        className={clsx(classes.iconButton, classes.acceptIcon)}
                        size="small"
                        onClick={() => handleAcepptTicket(ticket.id)}
                        disabled={loading}
                      >
                        <CheckCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={i18n.t("ticketsList.buttons.closed")}>
                      <IconButton
                        className={clsx(classes.iconButton, classes.closeIcon)}
                        size="small"
                        onClick={() => handleCloseTicket(ticket.id)}
                        disabled={loading}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {ticket.status === "attending" && (
                  <>
                    <Tooltip title={i18n.t("ticketsList.buttons.accept")}>
                      <IconButton
                        className={clsx(classes.iconButton, classes.acceptIcon)}
                        size="small"
                        onClick={() => handleAcepptTicket(ticket.id)}
                        disabled={loading}
                      >
                        <CheckCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={i18n.t("ticketsList.buttons.closed")}>
                      <IconButton
                        className={clsx(classes.iconButton, classes.closeIcon)}
                        size="small"
                        onClick={() => handleCloseTicket(ticket.id)}
                        disabled={loading}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {ticket.status !== "closed" && ticket.status !== "pending" && ticket.status !== "attending" && (
                  <>
                    <Tooltip title={i18n.t("ticketsList.buttons.transfer")}>
                      <IconButton
                        className={clsx(classes.iconButton, classes.transferIcon)}
                        size="small"
                        onClick={() => handleOpenTransferModal()}
                        disabled={loading}
                      >
                        <SwapHorizIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={i18n.t("ticketsList.buttons.closed")}>
                      <IconButton
                        className={clsx(classes.iconButton, classes.closeIcon)}
                        size="small"
                        onClick={() => handleCloseTicket(ticket.id)}
                        disabled={loading}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {ticket.status === "closed" && (
                  <Tooltip title={i18n.t("ticketsList.buttons.reopen")}>
                    <IconButton
                      className={clsx(classes.iconButton, classes.reopenIcon)}
                      size="small"
                      onClick={() => handleReopenTicket(ticket.id)}
                      disabled={loading}
                    >
                      <ReplayIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {/* Mantido: Badge de novas mensagens após botões */}
                {ticket.unreadMessages > 0 && (
                  <Badge
                    className={classes.newMessagesCount}
                    badgeContent={ticket.unreadMessages}
                    classes={{
                      badge: classes.badgeStyle,
                    }}
                  />
                )}
              </Box>
            </>
          }
        />
        <ListItemSecondaryAction>
          {ticket.lastMessage && (
            <>
              <Typography
                className={classes.lastMessageTime}
                component="span"
                variant="body2"
                color="textSecondary"
              >
                {isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
                  <>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
                ) : (
                  <>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
                )}
              </Typography>
              <br />
            </>
          )}
        </ListItemSecondaryAction>
      </ListItem>
      <Divider variant="inset" component="li" />
    </React.Fragment>
  );
};

export default TicketListItemCustom;