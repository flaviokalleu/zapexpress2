import React, { useContext, useState, useEffect } from "react";

import { useHistory } from "react-router-dom";

import { makeStyles, createTheme, ThemeProvider } from "@material-ui/core/styles";
import { IconButton } from "@material-ui/core";
import { MoreVert, Replay, Phone, Android } from "@material-ui/icons";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import UndoRoundedIcon from '@material-ui/icons/UndoRounded';
import Tooltip from '@material-ui/core/Tooltip';
import { green } from '@material-ui/core/colors';


const useStyles = makeStyles(theme => ({
    actionButtons: {
        marginRight: 6,
        flex: "none",
        alignSelf: "center",
        marginLeft: "auto",
        "& > *": {
            margin: theme.spacing(0.5),
        },
    },
    iconButton: {
        "&:hover": {
            backgroundColor: "#e3dbed",
        },
    },
}));

const TicketActionButtonsCustom = ({ ticket }) => {
    const classes = useStyles();
    const history = useHistory();
    const [anchorEl, setAnchorEl] = useState(null);
    const [loading, setLoading] = useState(false);
    const ticketOptionsMenuOpen = Boolean(anchorEl);
    const { user } = useContext(AuthContext);
    const { setCurrentTicket } = useContext(TicketsContext);
    const [localDisableBot, setLocalDisableBot] = useState(ticket.contact.disableBot);


    // Consulta o estado de disableBot quando o ticket muda
    useEffect(() => {
        const fetchDisableBot = async () => {
            if (!ticket.contact.id) return;
            try {
                console.log("Consultando disableBot ao mudar ticket - contactId:", ticket.contact.id);
                const { data: currentContact } = await api.get(`/contacts/${ticket.contact.id}`);
                console.log("Estado de disableBot ao mudar ticket:", currentContact.disableBot);
                setLocalDisableBot(currentContact.disableBot);
            } catch (err) {
                console.error("Erro ao consultar disableBot:", err);
                toastError(err);
            }
        };
        fetchDisableBot();
    }, [ticket.contact.id]);

    const customTheme = createTheme({
        palette: {
            primary: green,
        }
    });

    const handleOpenTicketOptionsMenu = e => {
        setAnchorEl(e.currentTarget);
    };

    const handleCloseTicketOptionsMenu = e => {
        setAnchorEl(null);
    };

    const handleUpdateTicketStatus = async (e, status, userId) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${ticket.id}`, {
                status: status,
                userId: userId || null,
                useIntegration: status === "closed" ? false : ticket.useIntegration,
                promptId: status === "closed" ? false : ticket.promptId,
                integrationId: status === "closed" ? false : ticket.integrationId
            });

            setLoading(false);
            if (status === "open") {
                setCurrentTicket({ ...ticket, code: "#open" });
            } else {
                setCurrentTicket({ id: null, code: null })
                history.push("/tickets");
            }
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
    };

    const handleOpenWavoipCall = async () => {
        console.log("Ticket completo:", ticket);
        console.log("WhatsApp ID:", ticket?.whatsappId);
        console.log("Número do contato:", ticket?.contact?.number);

        if (!ticket?.whatsappId) {
            toastError("Erro: ID do WhatsApp não disponível.");
            return;
        }
        if (!ticket?.contact?.number) {
            toastError("Erro: Número de telefone não disponível.");
            return;
        }

        try {
            const response = await api.get(`/whatsapp/${ticket.whatsappId}`);
            const wavoip = response.data.wavoip;
            console.log("Wavoip obtido da API:", wavoip);

            if (!wavoip) {
                toastError("Erro: Token Wavoip não disponível.");
                return;
            }

            const token = wavoip;
            const phone = ticket.contact.number.replace(/\D/g, "");
            const name = ticket.contact.name || "Sem nome";
            const url = `https://app.wavoip.com/call?token=${token}&phone=${phone}&name=${encodeURIComponent(name)}&start_if_ready=true&close_after_call=true`;

            window.open(url, "wavoip", "toolbar=no,scrollbars=no,resizable=no,top=500,left=500,width=500,height=700");
        } catch (err) {
            toastError("Erro ao buscar token Wavoip: " + err.message);
        }
    };

    const handleToggleChatbot = async () => {
        setLoading(true);
        try {
            const contactId = ticket.contact.id;
            console.log("Consultando estado atual do contato - contactId:", contactId);

            const { data: currentContact } = await api.get(`/contacts/${contactId}`);
            console.log("Estado atual do contato - disableBot:", currentContact.disableBot);

            const newDisableBot = !currentContact.disableBot;
            console.log("Novo valor para disableBot:", newDisableBot);

            const updatedContact = {
                name: currentContact.name,
                number: currentContact.number,
                email: currentContact.email || "",
                disableBot: newDisableBot,
                extraInfo: currentContact.extraInfo || [],
            };

            const { data: updatedData } = await api.put(`/contacts/${contactId}`, updatedContact);
            console.log("Resposta da API - contato atualizado, disableBot:", updatedData.disableBot);

            setLocalDisableBot(updatedData.disableBot);
            console.log("Estado local após atualização - localDisableBot:", updatedData.disableBot);

            setCurrentTicket({
                ...ticket,
                contact: { ...ticket.contact, disableBot: updatedData.disableBot },
            });

            toast.success(i18n.t("Chatbot alternado com sucesso!"));
        } catch (err) {
            console.error("Erro na requisição:", err);
            toastError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={classes.actionButtons}>
            <Tooltip title={i18n.t("Chamada de voz")}>
                <IconButton color="secondary" onClick={handleOpenWavoipCall} className={classes.iconButton} disabled={loading}>
                    <Phone />
                </IconButton>
            </Tooltip>
            <Tooltip title={i18n.t(localDisableBot ? "Habilitar chatbot" : "Desabilitar chatbot")}>
			    <IconButton
			        style={{ color: localDisableBot ? 'red' : 'green' }}
			        onClick={handleToggleChatbot}
			        className={classes.iconButton}
			        disabled={loading}
			    >
			        <Android />
			    </IconButton>
			</Tooltip>
			            {ticket.status === "closed" && (
                <ButtonWithSpinner
                    loading={loading}
                    startIcon={<Replay />}
                    size="small"
                    onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
                >
                    {i18n.t("messagesList.header.buttons.reopen")}
                </ButtonWithSpinner>
            )}
            {ticket.status === "open" && (
                <>
                    <Tooltip title={i18n.t("messagesList.header.buttons.return")}>
                        <IconButton onClick={e => handleUpdateTicketStatus(e, "pending", null)} className={classes.iconButton} disabled={loading}>
                            <UndoRoundedIcon />
                        </IconButton>
                    </Tooltip>
                    <ThemeProvider theme={customTheme}>
                        <Tooltip title={i18n.t("messagesList.header.buttons.resolve")}>
                            <IconButton onClick={e => handleUpdateTicketStatus(e, "closed", user?.id)} color="primary" className={classes.iconButton} disabled={loading}>
                                <CheckCircleIcon />
                            </IconButton>
                        </Tooltip>
                    </ThemeProvider>
                    <IconButton onClick={handleOpenTicketOptionsMenu} className={classes.iconButton} disabled={loading}>
                        <MoreVert />
                    </IconButton>
                    <TicketOptionsMenu
                        ticket={ticket}
                        anchorEl={anchorEl}
                        menuOpen={ticketOptionsMenuOpen}
                        handleClose={handleCloseTicketOptionsMenu}
                    />
                </>
            )}
            {ticket.status === "pending" && (
                <ButtonWithSpinner
                    loading={loading}
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
                >
                    {i18n.t("messagesList.header.buttons.accept")}
                </ButtonWithSpinner>
            )}
        </div>
    );
};

export default TicketActionButtonsCustom;