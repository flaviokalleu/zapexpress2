import React, { useState, useEffect } from "react";
import qs from 'query-string';
import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import usePlans from "../../hooks/usePlans";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import InputMask from 'react-input-mask';
import api from "../../services/api";
import {
	FormControl,
	InputLabel,
	MenuItem,
	Select,
} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import { i18n } from "../../translate/i18n";
import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import moment from "moment";

const Copyright = () => {
	return (
		<Typography variant="body2" color="textSecondary" align="center">
			{"Copyright © "}
			<Link color="inherit" href="#">
				ZAPXPRESS
			</Link>{" "}
			{new Date().getFullYear()}
			{"."}
		</Typography>
	);
};

// MODIFICAÇÃO 1: Ajustes nos estilos para reduzir tamanho e espaçamento dos componentes
const useStyles = makeStyles(theme => ({
	// Estilo raiz com layout dividido
	root: {
		display: "flex",
		flexDirection: "row",
		height: "100vh",
		backgroundColor: "#f4f6f8",
		[theme.breakpoints.down("sm")]: {
			flexDirection: "column",
		},
	},
	// Lado esquerdo com imagem de fundo
	leftSide: {
		flex: 1,
		backgroundImage: `url(${process.env.REACT_APP_BACKEND_URL}/public/logotipos/tela-login.png)`,
		backgroundSize: "cover",
		backgroundPosition: "center",
		[theme.breakpoints.down("sm")]: {
			height: "30vh",
			backgroundSize: "cover",
			backgroundRepeat: "no-repeat",
		},
	},
	// Lado direito com formulário
	rightSide: {
		flex: 1,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#fff",
		[theme.breakpoints.down("sm")]: {
			height: "70vh",
		},
	},
	// Container do formulário com sombra e animação
	paper: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: theme.spacing(2), // Reduzido de 3 para 2
		backgroundColor: "#fff",
		borderRadius: "12px",
		boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
		animation: "$fadeIn 0.5s ease-in",
	},
	"@keyframes fadeIn": {
		"0%": { opacity: 0, transform: "translateY(20px)" },
		"100%": { opacity: 1, transform: "translateY(0)" },
	},
	// Estilo do formulário
	form: {
		width: "100%",
		marginTop: theme.spacing(0.5), // Reduzido de 1 para 0.5
	},
	// MODIFICAÇÃO 2: Reduzir altura e espaçamento dos campos de texto
	inputField: {
		margin: theme.spacing(0.5, 0), // Reduzido de 1 para 0.5
		"& .MuiOutlinedInput-root": {
			borderRadius: "8px",
			"& fieldset": {
				borderColor: "#ddd",
			},
			"&:hover fieldset": {
				borderColor: "#38b6ff",
			},
			"&.Mui-focused fieldset": {
				borderColor: "#031c9f",
			},
			// Reduzir altura do input
			"& .MuiOutlinedInput-input": {
				padding: "10px 14px", // Reduzido de padrão (~18px) para 10px
			},
		},
		"& .MuiInputLabel-outlined": {
			transform: "translate(14px, 10px) scale(1)", // Ajustar posição do label
			"&.MuiInputLabel-shrink": {
				transform: "translate(14px, -6px) scale(0.75)", // Label encolhido
			},
		},
	},
	// MODIFICAÇÃO 3: Reduzir tamanho do botão
	submit: {
		margin: theme.spacing(1.5, 0, 0.5), // Reduzido de 2,0,1 para 1.5,0,0.5
		padding: theme.spacing(0.8), // Reduzido de 1.2 para 0.8
		borderRadius: "8px",
		background: "linear-gradient(to right, #031c9f, #38b6ff)",
		color: "#fff",
		"&:hover": {
			background: "linear-gradient(to right, #021675, #2a9bff)",
		},
		transition: "all 0.3s ease",
	},
	// Estilo do link
	link: {
		marginTop: theme.spacing(0.5), // Reduzido de 1 para 0.5
		textDecoration: "none",
		color: "#031c9f",
		"&:hover": {
			textDecoration: "underline",
		},
	},
	// Estilo do título
	title: {
		fontWeight: 600,
		color: "#333",
		marginBottom: theme.spacing(0.5), // Reduzido de 1 para 0.5
	},
	// MODIFICAÇÃO 4: Reduzir altura e espaçamento do campo Select
	selectField: {
		margin: theme.spacing(0.5, 0), // Reduzido de 1 para 0.5
		"& .MuiOutlinedInput-root": {
			borderRadius: "8px",
			"& fieldset": {
				borderColor: "#ddd",
			},
			"&:hover fieldset": {
				borderColor: "#38b6ff",
			},
			"&.Mui-focused fieldset": {
				borderColor: "#031c9f",
			},
			// Reduzir altura do select
			"& .MuiSelect-outlined": {
				padding: "10px 14px", // Reduzido para combinar com TextField
			},
		},
		"& .MuiInputLabel-outlined": {
			transform: "translate(14px, 10px) scale(1)", // Ajustar posição do label
			"&.MuiInputLabel-shrink": {
				transform: "translate(14px, -6px) scale(0.75)", // Label encolhido
			},
		},
	},
}));

const UserSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
	email: Yup.string().email("Invalid email").required("Required"),
});

const SignUp = () => {
	const classes = useStyles();
	const history = useHistory();
	const theme = useTheme();
	const [allowregister, setallowregister] = useState('enabled');
	const [trial, settrial] = useState('3');

	let companyId = null;

	useEffect(() => {
		fetchallowregister();
		fetchtrial();
	}, []);

	const fetchtrial = async () => {
		try {
			const responsevvv = await api.get("/settings/trial");
			const allowtrialX = responsevvv.data.value;
			settrial(allowtrialX);
		} catch (error) {
			console.error('Error retrieving trial', error);
		}
	};

	const fetchallowregister = async () => {
		try {
			const responsevv = await api.get("/settings/allowregister");
			const allowregisterX = responsevv.data.value;
			setallowregister(allowregisterX);
		} catch (error) {
			console.error('Error retrieving allowregister', error);
		}
	};

	if (allowregister === "disabled") {
		history.push("/login");
	}

	const params = qs.parse(window.location.search);
	if (params.companyId !== undefined) {
		companyId = params.companyId;
	}

	const initialState = { name: "", email: "", phone: "", password: "", planId: "disabled" };
	const [user] = useState(initialState);
	const dueDate = moment().add(trial, "day").format();

	const handleSignUp = async values => {
		Object.assign(values, { recurrence: "MENSAL" });
		Object.assign(values, { dueDate: dueDate });
		Object.assign(values, { status: "t" });
		Object.assign(values, { campaignsEnabled: true });
		try {
			await openApi.post("/companies/cadastro", values);
			toast.success(i18n.t("signup.toasts.success"));
			history.push("/login");
		} catch (err) {
			console.log(err);
			toastError(err);
		}
	};

	const [plans, setPlans] = useState([]);
	const { register: listPlans } = usePlans();

	useEffect(() => {
		async function fetchData() {
			const list = await listPlans();
			setPlans(list);
		}
		fetchData();
	}, []);

	return (
		<div className={classes.root}>
			<div className={classes.leftSide}></div>
			<div className={classes.rightSide}>
				<Container component="main" maxWidth="xs">
					<CssBaseline />
					<div className={classes.paper}>
						<Typography variant="h5" className={classes.title}>
							{i18n.t("signup.title") || "Cadastre sua Empresa"}
						</Typography>
						<Formik
							initialValues={user}
							enableReinitialize={true}
							validationSchema={UserSchema}
							onSubmit={(values, actions) => {
								setTimeout(() => {
									handleSignUp(values);
									actions.setSubmitting(false);
								}, 400);
							}}
						>
							{({ touched, errors, isSubmitting }) => (
								<Form className={classes.form}>
									<Grid container spacing={1}>
										<Grid item xs={12}>
											<Field
												as={TextField}
												autoComplete="name"
												name="name"
												error={touched.name && Boolean(errors.name)}
												helperText={touched.name && errors.name}
												variant="outlined"
												fullWidth
												id="name"
												label="Nome da Empresa"
												className={classes.inputField}
											/>
										</Grid>
										<Grid item xs={12}>
											<Field
												as={TextField}
												variant="outlined"
												fullWidth
												id="email"
												label={i18n.t("signup.form.email")}
												name="email"
												error={touched.email && Boolean(errors.email)}
												helperText={touched.email && errors.email}
												autoComplete="email"
												required
												className={classes.inputField}
											/>
										</Grid>
										<Grid item xs={12}>
											<Field
												as={InputMask}
												mask="(99) 99999-9999"
												variant="outlined"
												fullWidth
												id="phone"
												name="phone"
												error={touched.phone && Boolean(errors.phone)}
												helperText={touched.phone && errors.phone}
												autoComplete="phone"
												required
											>
												{({ field }) => (
													<TextField
														{...field}
														variant="outlined"
														fullWidth
														label="DDD988888888"
														inputProps={{ maxLength: 11 }}
														className={classes.inputField}
													/>
												)}
											</Field>
										</Grid>
										<Grid item xs={12}>
											<Field
												as={TextField}
												variant="outlined"
												fullWidth
												name="password"
												error={touched.password && Boolean(errors.password)}
												helperText={touched.password && errors.password}
												label={i18n.t("signup.form.password")}
												type="password"
												id="password"
												autoComplete="current-password"
												required
												className={classes.inputField}
											/>
										</Grid>
										<Grid item xs={12}>
											<InputLabel htmlFor="plan-selection">Plano</InputLabel>
											<Field
												as={Select}
												variant="outlined"
												fullWidth
												id="plan-selection"
												label="Plano"
												name="planId"
												required
												className={classes.selectField}
											>
												<MenuItem value="disabled" disabled>
													<em>Selecione seu plano de assinatura</em>
												</MenuItem>
												{plans.map((plan, key) => (
													<MenuItem key={key} value={plan.id}>
														{plan.name} - {plan.connections} WhatsApps - {plan.users} Usuários - R$ {plan.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
													</MenuItem>
												))}
											</Field>
										</Grid>
									</Grid>
									<Button
										type="submit"
										fullWidth
										variant="contained"
										className={classes.submit}
										disabled={isSubmitting}
									>
										{i18n.t("signup.buttons.submit")}
									</Button>
									<Grid container justifyContent="flex-end">
										<Grid item>
											<Link component={RouterLink} to="/login" variant="body2" className={classes.link}>
												{i18n.t("signup.buttons.login")}
											</Link>
										</Grid>
									</Grid>
								</Form>
							)}
						</Formik>
					</div>
					<Box mt={2}>
						<Copyright />
					</Box>
				</Container>
			</div>
		</div>
	);
};

export default SignUp;