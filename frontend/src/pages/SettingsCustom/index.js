import React, { useState, useEffect } from "react";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import { makeStyles, Paper, Tabs, Tab } from "@material-ui/core";

import TabPanel from "../../components/TabPanel";

import SchedulesForm from "../../components/SchedulesForm";
import CompaniesManager from "../../components/CompaniesManager";
import PlansManager from "../../components/PlansManager";
import HelpsManager from "../../components/HelpsManager";
import Options from "../../components/Settings/Options";
import Uploader from "../../components/Settings/Uploader";
import NewCompaniesManager from "../../pages/Companies";

import { i18n } from "../../translate/i18n.js";
import { toast } from "react-toastify";

import useCompanies from "../../hooks/useCompanies";
import useAuth from "../../hooks/useAuth.js";
import useSettings from "../../hooks/useSettings";

import OnlyForSuperUser from "../../components/OnlyForSuperUser";

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.palette.background.paper,
  },
  mainPaper: {
    ...theme.scrollbarStyles,
    overflowY: "scroll",
    flex: 1,
  },
  tab: {
    backgroundColor: theme.palette.options,
    borderRadius: 4,
  },
  paper: {
    ...theme.scrollbarStyles,
    overflowY: "scroll",
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  container: {
    width: "100%",
    maxHeight: "100%",
  },
  control: {
    padding: theme.spacing(1),
  },
  textfield: {
    width: "100%",
  },
}));

const SettingsCustom = () => {
  const classes = useStyles();
  const [tab, setTab] = useState("options");
  const [schedules, setSchedules] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [settings, setSettings] = useState({});
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);

  const { getCurrentUserInfo } = useAuth();
  const { find, updateSchedules } = useCompanies();
  const { getAll: getAllSettings } = useSettings();

  // MODIFICAÇÃO: Ler o localStorage para restaurar a aba "Logo" após o reload do upload
  useEffect(() => {
    const activeTab = localStorage.getItem('activeTab');
    const uploadTimestamp = localStorage.getItem('uploadTimestamp');
    const currentTime = Date.now();
    const timeThreshold = 5000; // 5 segundos

    if (activeTab === 'logo' && uploadTimestamp && (currentTime - parseInt(uploadTimestamp) < timeThreshold)) {
      setTab('uploader'); // Define a aba "Logo" (uploader) como ativa após o reload do upload
    }

    // Limpar o localStorage para evitar que a aba "Logo" seja selecionada em novas navegações
    localStorage.removeItem('activeTab');
    localStorage.removeItem('uploadTimestamp');
  }, []);

  useEffect(() => {
    async function findData() {
      setLoading(true);
      try {
        const companyId = localStorage.getItem("companyId");
        const company = await find(companyId);
        const settingList = await getAllSettings();
        setCompany(company);
        setSchedules(company.schedules);
        setSettings(settingList);

        if (Array.isArray(settingList)) {
          const scheduleType = settingList.find(
            (d) => d.key === "scheduleType"
          );
          if (scheduleType) {
            setSchedulesEnabled(scheduleType.value === "company");
          }
        }

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

  const handleTabChange = (event, newValue) => {
    async function findData() {
      setLoading(true);
      try {
        const companyId = localStorage.getItem("companyId");
        const company = await find(companyId);
        const settingList = await getAllSettings();
        setCompany(company);
        setSchedules(company.schedules);
        setSettings(settingList);

        if (Array.isArray(settingList)) {
          const scheduleType = settingList.find(
            (d) => d.key === "scheduleType"
          );
          if (scheduleType) {
            setSchedulesEnabled(scheduleType.value === "company");
          }
        }

        const user = await getCurrentUserInfo();
        setCurrentUser(user);
      } catch (e) {
        toast.error(e);
      }
      setLoading(false);
    }
    findData();
    // MODIFICAÇÃO: Limpar o localStorage quando o usuário muda de aba manualmente
    localStorage.removeItem('activeTab');
    localStorage.removeItem('uploadTimestamp');
    setTab(newValue);
  };

  const handleSubmitSchedules = async (data) => {
    setLoading(true);
    try {
      setSchedules(data);
      await updateSchedules({ id: company.id, schedules: data });
      toast.success("Horários atualizados com sucesso.");
    } catch (e) {
      toast.error(e);
    }
    setLoading(false);
  };

  const isSuper = () => {
    return currentUser.super;
  };

  return (
    <MainContainer className={classes.root}>
      <MainHeader>
        <Title>{i18n.t("settings.title")}</Title>
      </MainHeader>
      <Paper className={classes.mainPaper} elevation={1}>
        <Tabs
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          onChange={handleTabChange}
          className={classes.tab}
        >
          <Tab label="Opções" value={"options"} />
          {schedulesEnabled && <Tab label="Horários" value={"schedules"} />}
          {isSuper() ? <Tab label="Logo" value={"uploader"} /> : null}
          {isSuper() ? <Tab label="Empresas" value={"companies"} /> : null}
          {isSuper() ? <Tab label="Cadastrar Empresa" value={"newcompanie"} /> : null}
          {isSuper() ? <Tab label="Planos" value={"plans"} /> : null}
          {isSuper() ? <Tab label="Ajuda" value={"helps"} /> : null}
        </Tabs>
        <Paper className={classes.paper} elevation={0}>
          <TabPanel
            className={classes.container}
            value={tab}
            name={"schedules"}
          >
            <SchedulesForm
              loading={loading}
              onSubmit={handleSubmitSchedules}
              initialValues={schedules}
            />
          </TabPanel>
          <OnlyForSuperUser
            user={currentUser}
            yes={() => (
              <TabPanel
                className={classes.container}
                value={tab}
                name={"companies"}
              >
                <CompaniesManager />
              </TabPanel>
            )}
          />
          <OnlyForSuperUser
            user={currentUser}
            yes={() => (
              <TabPanel
                className={classes.container}
                value={tab}
                name={"newcompanie"}
              >
                <NewCompaniesManager />
              </TabPanel>
            )}
          />
          <OnlyForSuperUser
            user={currentUser}
            yes={() => (
              <TabPanel
                className={classes.container}
                value={tab}
                name={"plans"}
              >
                <PlansManager />
              </TabPanel>
            )}
          />
          <OnlyForSuperUser
            user={currentUser}
            yes={() => (
              <TabPanel
                className={classes.container}
                value={tab}
                name={"helps"}
              >
                <HelpsManager />
              </TabPanel>
            )}
          />
          <OnlyForSuperUser
            user={currentUser}
            yes={() => (
              <TabPanel
                className={classes.container}
                value={tab}
                name={"uploader"}
              >
                <Uploader />
              </TabPanel>
            )}
          />
          <TabPanel className={classes.container} value={tab} name={"options"}>
            <Options
              settings={settings}
              scheduleTypeChanged={(value) =>
                setSchedulesEnabled(value === "company")
              }
            />
          </TabPanel>
        </Paper>
      </Paper>
    </MainContainer>
  );
};

export default SettingsCustom;