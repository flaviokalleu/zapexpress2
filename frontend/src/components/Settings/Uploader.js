import React, { useContext, useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import {
  makeStyles,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
} from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import { head } from "lodash";
import { ToastContainer, toast } from 'react-toastify';
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
import { grey, blue } from "@material-ui/core/colors";
import { Tabs, Tab } from "@material-ui/core";
import ButtonWithSpinner from "../ButtonWithSpinner";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  mainPaper: {
    width: "100%",
    flex: 1,
    padding: theme.spacing(2),
  },
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
    background: "#f2f5f3",
    borderRadius: 4,
    width: "100%",
    "& .MuiTab-wrapper": {
      color: "#128c7e"
    },
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
  buttonContainer: {
    textAlign: "right",
    padding: theme.spacing(1),
  },
  fileInput: {
    background: "red",
  },
  fileInputLabel: {
    display: "inline-block",
    backgroundColor: "#7c7c7c",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    "& input": {
      display: "none",
    },
  },
}));

const Uploader = () => {
  const [file, setFile] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedFileName, setSelectedFileName] = useState('');

  const [systemTitle, setSystemTitle] = useState(""); // Estado para o título do sistema
  const [loadingTitle, setLoadingTitle] = useState(false); // Estado para carregamento

  // Busca o título atual ao carregar o componente
  useEffect(() => {
    async function fetchSystemTitle() {
      try {
        const { data } = await api.get("/settings/system_title");
        setSystemTitle(data?.value || "");
      } catch (error) {
        toastError(error);
      }
    }
    fetchSystemTitle();
  }, []);

  // Função para salvar o título
  const handleSaveTitle = async () => {
    if (!systemTitle.trim()) {
      toast.warn("Digite um título válido!");
      return;
    }
    setLoadingTitle(true);
    try {
      await api.put("/settings/system_title", { value: systemTitle });
      toast.success("Título atualizado com sucesso!");
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Aguarda 1 segundo para mostrar o toast
    } catch (error) {
      toastError(error);
    }
    setLoadingTitle(false);
  };

  // MODIFICAÇÃO: Estado para controlar a aba ativa
  // Usado para manter a aba "Logo" selecionada, embora a lógica de abas seja gerenciada pelo componente pai
  const [tabValue, setTabValue] = useState(0);
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const history = useHistory();

  // Verificar permissão
  useEffect(() => {
    async function fetchData() {
      if (!user.super) {
        toast.error("Sem permissão para acessar!");
        setTimeout(() => {
          history.push(`/`);
        }, 500);
      }
    }
    fetchData();
  }, [user, history]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    const allowedTypes = selectedOption === "favicon"
      ? ["image/png", "image/x-icon"]
      : ["image/png"];

    if (selectedFile && allowedTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setSelectedFileName(selectedFile.name);
    } else {
      setFile(null);
      setSelectedFileName('');
      toast.error(`Use somente arquivos ${selectedOption === "favicon" ? "PNG ou ICO" : "PNG"}!`);
    }
  };

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
    setFile(null);
    setSelectedFileName('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      toast.warn("Escolha um arquivo!");
      return;
    }

    if (!selectedOption) {
      toast.warn("Escolha um destino!");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post(`/settings/media-upload?ref=${selectedOption}`, formData);
      if (response.data.mensagem === 'Arquivo Anexado') {
        toast.success("Arquivo enviado com sucesso!");
        setFile(null);
        setSelectedFileName('');
        // MODIFICAÇÃO: Não limpar o selectedOption para manter a opção selecionada no dropdown
        // Isso facilita múltiplos uploads na mesma categoria (ex.: "Banner Login e Registro")
        // setSelectedOption(''); // Removido para manter a seleção
        // MODIFICAÇÃO: Salvar a aba ativa e um timestamp no localStorage antes do reload
        // O timestamp permite que o SettingsCustom.js diferencie um reload de upload de uma nova navegação
        localStorage.setItem('activeTab', 'logo');
        localStorage.setItem('uploadTimestamp', Date.now());
        // MODIFICAÇÃO: Adicionar reload da página para refletir o resultado do upload
        // Atualiza a interface para mostrar a nova imagem, se exibida
        window.location.reload();
      }
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <>
      <Grid spacing={3} container>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
          // MODIFICAÇÃO: Controle de estado para a aba ativa
          // Atualmente, há apenas uma aba no Uploader.js, mas o componente pai gerencia múltiplas abas
          value={tabValue}
          onChange={(event, newValue) => setTabValue(newValue)}
          style={{
            marginBottom: 20,
            marginTop: 20
          }}
        >
          <Tab label="Logotipos / Ícones" />
        </Tabs>

        <form onSubmit={handleSubmit} className={classes.fullWidth}>
          <Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
            <FormControl className={classes.selectContainer}>
              <InputLabel id="selectOption-label">Escolha uma opção:</InputLabel>
              <Select
                labelId="selectOption-label"
                value={selectedOption}
                onChange={handleOptionChange}
                style={{ marginTop: 15, marginBottom: 15 }}
              >
                <MenuItem value="banner">Banner Login e Registro</MenuItem>
                <MenuItem value="logo_menu_interno">Logo Menu</MenuItem>
                <MenuItem value="logo_menu_interno_dark">Logo Menu Dark</MenuItem>
                <MenuItem value="logo_interno">Logo Interno</MenuItem>
                <MenuItem value="logo_favicon">Favicon</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
            <FormControl className={classes.fullWidth}>
              <label className={classes.fileInputLabel}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className={classes.fileInput}
                  style={{ marginTop: 15, marginBottom: 15 }}
                />
                {selectedFileName ? selectedFileName : 'Escolher imagem'}
              </label>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
            <ButtonWithSpinner
              type="submit"
              className={`${classes.fullWidth} ${classes.button}`}
              style={{ marginTop: 15, marginBottom: 15 }}
              variant="contained"
              color="primary"
            >
              ENVIAR ARQUIVO
            </ButtonWithSpinner>
          </Grid>

          <Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
            <FormControl className={classes.fullWidth}>
              <TextField
                label="Título do Sistema"
                value={systemTitle}
                onChange={(e) => setSystemTitle(e.target.value)}
                variant="outlined"
                style={{ marginTop: 15, marginBottom: 15 }}
                disabled={loadingTitle}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={12} style={{ display: 'flex' }}>
            <ButtonWithSpinner
              onClick={handleSaveTitle}
              className={`${classes.fullWidth} ${classes.button}`}
              style={{ marginTop: 15, marginBottom: 15 }}
              variant="contained"
              color="primary"
              loading={loadingTitle}
            >
              SALVAR TÍTULO
            </ButtonWithSpinner>
          </Grid>
        </form>
      </Grid>
    </>
  );
};

export default Uploader;