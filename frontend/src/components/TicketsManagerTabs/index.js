import React, { useContext, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import Highlighter from "react-highlight-words";
import {
  Add as AddIcon,
  Visibility,
  VisibilityOff,
} from "@material-ui/icons"; // Importação correta

import clsx from "clsx"; // Adiciona a importação do clsx

import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import SearchIcon from '@material-ui/icons/Search';
import InputBase from '@material-ui/core/InputBase';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Badge from '@material-ui/core/Badge';
import PlaylistAddCheckOutlinedIcon from '@material-ui/icons/PlaylistAddCheckOutlined';
import GroupIcon from '@material-ui/icons/Group';
import toastError from '../../errors/toastError';
import api from '../../services/api';
import {Snackbar, IconButton } from "@material-ui/core";
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import ChatIcon from '@material-ui/icons/Chat';
import DoneAllIcon from '@material-ui/icons/DoneAll';
import NewTicketModal from '../NewTicketModal';
import TicketsList from '../TicketsListCustom';
import TicketsListGroup from '../TicketsListGroup';

import TabPanel from '../TabPanel';

import { i18n } from '../../translate/i18n';
import { AuthContext } from '../../context/Auth/AuthContext';
import { Can } from '../Can';
import TicketsQueueSelect from '../TicketsQueueSelect';
import { Button, Grid } from '@material-ui/core';
import { TagsFilter } from '../TagsFilter';
import { UsersFilter } from '../UsersFilter';

import { DatePickerMoment } from '../DatePickerMoment';

import Tooltip from '@material-ui/core/Tooltip'; // Adiciona Tooltip


const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: 'relative',
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  tabsHeader: {
    flex: 'none',
    backgroundColor: theme.palette.background.default,
  },

  settingsIcon: {
    alignSelf: 'center',
    marginLeft: 'auto',
    padding: 8,
  },

  tab: {
    minWidth: 60,
    width: 60,
  },

  ticketOptionsBox: {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    borderRadius: 4,
    border: '2px solid #D3D3D3',
    backgroundColor: "#eeeeee",
    padding: theme.spacing(1),
    marginTop: theme.spacing(1), // Adiciona margem à esquerda (16px)
    marginLeft: theme.spacing(1), // Adiciona margem à esquerda (16px)
    marginRight: theme.spacing(1), // Adiciona margem à direita (16px)
  },

  serachInputWrapper: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
    display: 'flex',
    borderRadius: 40,
    padding: 4,
    marginRight: theme.spacing(1),
  },

  searchIcon: {
    color: theme.palette.primary.main,
    marginLeft: 6,
    marginRight: 6,
    alignSelf: 'center',
  },

  searchInput: {
    flex: 1,
    border: 'none',
    borderRadius: 25,
    outline: 'none',
  },

  snackbar: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: theme.palette.primary.main,
    color: "white",
    borderRadius: 30,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.8em",
    },
    [theme.breakpoints.up("md")]: {
      fontSize: "1em",
    },
  },

  yesButton: {
    backgroundColor: "#FFF",
    color: "rgba(0, 100, 0, 1)",
    padding: "4px 4px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginRight: theme.spacing(1),
    "&:hover": {
      backgroundColor: "darkGreen",
      color: "#FFF",
    },
    borderRadius: 30,
  },
  noButton: {
    backgroundColor: "#FFF",
    color: "rgba(139, 0, 0, 1)",
    padding: "4px 4px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    "&:hover": {
      backgroundColor: "darkRed",
      color: "#FFF",
    },
    borderRadius: 30,
  },

  badge: {
    right: '-10px',
  },
  show: {
    display: 'block',
  },
  hide: {
    display: 'none !important',
  },

  // Novas classes para bordas dos elementos individuais
  borderedIconButton: {
    border: '2px solid #B0BEC5', // Borda cinza clara
    borderRadius: 4, // Cantos arredondados
    padding: 2, // Ajuste para manter o tamanho

    transition: "border-color 0.5s ease", // Transição suave da cor da borda
    "&:hover": {
      border: '2px solid #101a35', // Borda cinza clara
    },

    '& .MuiSvgIcon-root': {
      fontSize: '1.2rem', // Reduz o tamanho dos ícones
    },
  },

  queueSelect: {
    border: '2px solid #B0BEC5', // Borda externa personalizada
    borderRadius: 4,
    padding: 2, // Padding externo reduzido
    transition: 'border-color 0.5s ease',
    '&:hover': {
      borderColor: '#101a35', // Cor da borda no hover
    },
    '& .MuiInputBase-root': {
      border: 'none', // Remove a borda interna do input base
      height: '50px', // Altura reduzida (ajuste conforme necessário)
      padding: '0 24px 0 8px', // Padding interno: esquerda e direita (24px para a seta do Select)
      fontSize: '0.875rem', // Tamanho da fonte menor para consistência
    },
    '& .MuiSelect-select': {
      padding: '6px 0', // Ajusta o padding interno do Select
      lineHeight: '1.2', // Reduz a altura da linha
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none', // Remove a outline do Select (se for variante outlined)
    },
    '& .MuiSvgIcon-root': {
      fontSize: '1.2rem', // Reduz o tamanho da seta do Select
      right: '4px', // Ajusta a posição da seta
    },
  },


}));

const TicketsManagerTabs = () => {
  const classes = useStyles();
  const history = useHistory();

  const [isHoveredAll, setIsHoveredAll] = useState(false);
  const [isHoveredNew, setIsHoveredNew] = useState(false);
  const [isHoveredResolve, setIsHoveredResolve] = useState(false);
  const [isHoveredOpen, setIsHoveredOpen] = useState(false);
  const [isHoveredClosed, setIsHoveredClosed] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [messageSearch, setMessageSearch] = useState("");

  const [tab, setTab] = useState('open');
  const [tabOpen, setTabOpen] = useState('open');
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const searchInputRef = useRef();
  const { user } = useContext(AuthContext);
  const { profile } = user;

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: '',
    until: '',
  });

  const [setClosedBox, setClosed] = useState(false);
  const [setGroupBox, setGroup] = useState(false);

  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    setClosed(true); // Sempre exibir a aba de tickets fechados
  }, []);

  useEffect(() => {
    async function fetchData() {
      let settingIndex;

      try {
        const { data } = await api.get('/settings/');
        settingIndex = data.filter((s) => s.key === 'viewgroups');
      } catch (err) {
        toastError(err);
      }

      if (settingIndex[0]?.value === 'enabled') {
        setGroup(true);
      } else {
        if (user.profile === 'admin') {
          setGroup(true);
        } else {
          setGroup(false);
        }
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (
      user.profile.toUpperCase() === 'ADMIN'
    ) {
      setShowAllTickets(true);
    }
  }, []);

  useEffect(() => {
    if (tab === 'search') {
      searchInputRef.current.focus();
    }
  }, [tab]);

  let searchTimeout;

  const handleSelectedDate = (value, range) => {
    setSelectedDateRange({ ...selectedDateRange, [range]: value });
  };

  const handleSearch = async (e) => {
  const searchedTerm = e.target.value.toLowerCase();
  console.log("Busca iniciada para:", searchedTerm);
  clearTimeout(searchTimeout);

  if (searchedTerm === "") {
    setMessageSearch("");
    setSearchResults([]); // Garante que os resultados sejam limpos
    console.log("Busca limpa, searchResults resetado para: []");
    return;
  }

  searchTimeout = setTimeout(async () => {
    console.log("Chamando API para:", searchedTerm);
    setMessageSearch(searchedTerm);
    try {
      const response = await api.get("/tickets/search-messages", {
        params: { searchParam: searchedTerm },
      });
      console.log("Resposta da API:", response.data);
      setSearchResults(response.data);
    } catch (err) {
      console.error("Erro na busca:", err);
      toastError(err);
      setSearchResults([]); // Limpa resultados em caso de erro
    }
  }, 500);
};

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleSnackbarOpen = () => {
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };


  const CloseAllTicket = async () => {
    try {
      const { data } = await api.post("/tickets/closeAll", {
        status: tabOpen,
        selectedQueueIds,
      });

      handleSnackbarClose();

    } catch (err) {
      console.log("Error: ", err);
    }
  };

  const handleChangeTabOpen = (e, newValue) => {
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    setSelectedTags(tags);
  };

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setSelectedUsers(users);
  };

  return (
    <Paper elevation={0} variant='outlined' className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />

      {setClosedBox && (
        <>
          <Paper elevation={0} square className={classes.tabsHeader}>
            <Tabs
              value={tab}
              onChange={handleChangeTab}
              variant='fullWidth'
              indicatorColor='primary'
              textColor='primary'
              aria-label='icon label tabs example'
            >
              <Tab
                value={'open'}
                icon={<ChatIcon />}
                classes={{ root: classes.tab }}
              />
              {setGroupBox && (
                <Tab
                  value={'group'}
                  icon={<GroupIcon />}
                  classes={{ root: classes.tab }}
                />
              )}
              <Tab
                value={'closed'}
                icon={<DoneAllIcon />}
                classes={{ root: classes.tab }}
              />
              <Tab
                value={'search'}
                icon={<SearchIcon />}
                classes={{ root: classes.tab }}
              />
            </Tabs>
          </Paper>
        </>
      )}

      {!setClosedBox && (
        <>
          <Paper elevation={0} square className={classes.tabsHeader}>
            <Tabs
              value={tab}
              onChange={handleChangeTab}
              variant='fullWidth'
              indicatorColor='primary'
              textColor='primary'
              aria-label='icon label tabs example'
            >
              <Tab
                value={'open'}
                icon={<ChatIcon />}
                classes={{ root: classes.tab }}
              />
              {setGroupBox && (
                <Tab
                  value={'group'}
                  icon={<GroupIcon />}
                  classes={{ root: classes.tab }}
                />
              )}
            </Tabs>
          </Paper>
        </>
      )}

<Paper square elevation={0} className={classes.ticketOptionsBox}>
  {tab === 'search' ? (
    <div className={classes.serachInputWrapper}>
      <SearchIcon className={classes.searchIcon} />
      <InputBase
        className={classes.searchInput}
        inputRef={searchInputRef}
        placeholder="Buscar nas mensagens"
        type="search"
        onChange={handleSearch}
      />
    </div>
  ) : (
    <>
      {(tab === 'open' || tab === 'closed') && (
        <Tooltip title={i18n.t("Novo")} placement="bottom">
          <IconButton
            onMouseEnter={() => setIsHoveredNew(true)}
            onMouseLeave={() => setIsHoveredNew(false)}
            className={clsx(classes.button, classes.borderedIconButton)}
            onClick={() => {
              setNewTicketModalOpen(true);
            }}
          >
            <AddIcon className={classes.icon} />
          </IconButton>
        </Tooltip>
      )}
      <Snackbar
        open={snackbarOpen}
        onClose={handleSnackbarClose}
        message={i18n.t("tickets.inbox.closedAllTickets")}
        ContentProps={{
          className: classes.snackbar
        }}
        action={
          <>
            <Button
              className={classes.yesButton}
              size="small"
              onClick={CloseAllTicket}
            >
              {i18n.t("tickets.inbox.yes")}
            </Button>
            <Button
              className={classes.noButton}
              size="small"
              onClick={handleSnackbarClose}
            >
              {i18n.t("tickets.inbox.no")}
            </Button>
          </>
        }
      />
      {user.profile === "admin" && (
        <Tooltip title={i18n.t("tickets.inbox.closedAll")} placement="bottom">
          <IconButton
            onMouseEnter={() => setIsHoveredResolve(true)}
            onMouseLeave={() => setIsHoveredResolve(false)}
            className={clsx(classes.button, classes.borderedIconButton)}
            onClick={handleSnackbarOpen}
          >
            <PlaylistAddCheckOutlinedIcon style={{ color: "green" }} />
          </IconButton>
        </Tooltip>
      )}
      <Can
        role={user.profile}
        perform='tickets-manager:showall'
        yes={() => (
          <Tooltip title="Todos" placement="bottom">
            <IconButton
              className={clsx(classes.button, classes.borderedIconButton)}
              onClick={() => setShowAllTickets((prevState) => !prevState)}
            >
              {showAllTickets ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
        )}
      />
      <Tooltip title={i18n.t("ticketsQueueSelect.placeholder")} placement="bottom">
        <TicketsQueueSelect
          className={classes.queueSelect}
          style={{ marginLeft: 6, height: 4 }}
          selectedQueueIds={selectedQueueIds}
          userQueues={user?.queues}
          onChange={(values) => setSelectedQueueIds(values)}
        />
      </Tooltip>
    </>
  )}
</Paper>

      <TabPanel value={tab} name='open' className={classes.ticketsWrapper}>
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          indicatorColor='primary'
          textColor='primary'
          variant='fullWidth'
        >
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                color='primary'
              >
                {i18n.t('ticketsList.assignedHeader')}
              </Badge>
            }
            value={'open'}
          />
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                color='primary'
              >
                {i18n.t('ticketsList.pendingHeader')}
              </Badge>
            }
            value={'pending'}
          />
        </Tabs>
        <Paper className={classes.ticketsWrapper}>
          <TicketsList
            status='open'
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle('open')}
          />
          <TicketsList
            status='pending'
            showAll={showAllTickets} // Adicionado
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle('pending')}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} name='group' className={classes.ticketsWrapper}>
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          indicatorColor='primary'
          textColor='primary'
          variant='fullWidth'
        >
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                color='primary'
              >
                {i18n.t('ticketsList.assignedHeader')}
              </Badge>
            }
            value={'open'}
          />
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                color='primary'
              >
                {i18n.t('ticketsList.pendingHeader')}
              </Badge>
            }
            value={'pending'}
          />
        </Tabs>
        <Paper className={classes.ticketsWrapper}>
          <TicketsListGroup
            status='open'
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle('open')}
          />
          <TicketsListGroup
            status='pending'
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle('pending')}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} name='closed' className={classes.ticketsWrapper}>
        <TicketsList
          status='closed'
          showAll={showAllTickets} // Alterado de false para showAllTickets
          userId={user.id}
          selectedQueueIds={selectedQueueIds}
        />
        {setGroupBox && (
          <TicketsListGroup
            status='closed'
            showAll={showAllTickets} // Alterado de true para showAllTickets
            selectedQueueIds={selectedQueueIds}
          />
        )}
      </TabPanel>


        <TabPanel value={tab} name='search' className={classes.ticketsWrapper}>
        <TagsFilter onFiltered={handleSelectedTags} />
        {(profile === 'admin') && (
          <UsersFilter onFiltered={handleSelectedUsers} />
        )}
        <TicketsList
          searchParam={messageSearch}
          tickets={messageSearch ? searchResults : []}
          showAll={showAllTickets} // Alterado de false para showAllTickets
          userId={user.id}
          tags={selectedTags}
          users={selectedUsers}
          selectedQueueIds={selectedQueueIds}
          highlightWords={messageSearch ? [messageSearch] : []}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManagerTabs;
