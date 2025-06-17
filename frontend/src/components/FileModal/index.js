import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import {
    Formik,
    Form,
    Field,
    FieldArray
} from "formik";
import { toast } from "react-toastify";

import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    makeStyles,
    TextField
} from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AttachFileIcon from "@material-ui/icons/AttachFile";

import { green } from "@material-ui/core/colors";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
        gap: 4
    },
    multFieldLine: {
        display: "flex",
        "& > *:not(:last-child)": {
            marginRight: theme.spacing(1),
        },
    },
    textField: {
        marginRight: theme.spacing(1),
        flex: 1,
    },

    extraAttr: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },

    btnWrapper: {
        position: "relative",
    },

    buttonProgress: {
        color: green[500],
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12,
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 2000,
    },
    colorAdorment: {
        width: 20,
        height: 20,
    },
}));

const FileListSchema = Yup.object().shape({
    message: Yup.string()
        .max(255, "A mensagem deve ter no máximo 255 caracteres")
        .required("Obrigatório"),
    options: Yup.array().of(
        Yup.object().shape({
            file: Yup.mixed().required("Arquivo é obrigatório"),
            message: Yup.string()
                .max(255, "A mensagem deve ter no máximo 255 caracteres")
                .required("Mensagem é obrigatória")
        })
    ).min(1, "Selecione pelo menos um arquivo")
});

const generateFileName = (file) => {
    const timestamp = new Date().getTime();
    const extension = file.name.split('.').pop().toLowerCase();
    
    // Primeiro tenta identificar pelo MIME type
    let fileType = file.type.split('/')[0];
    
    // Se não conseguir identificar pelo MIME type, tenta pela extensão
    if (fileType === 'application' || fileType === 'other') {
        switch(extension) {
            case 'mp4':
            case 'avi':
            case 'mov':
            case 'wmv':
            case 'flv':
            case 'mkv':
                fileType = 'video';
                break;
            case 'mp3':
            case 'wav':
            case 'ogg':
            case 'm4a':
            case 'aac':
                fileType = 'audio';
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'webp':
                fileType = 'image';
                break;
            case 'txt':
            case 'doc':
            case 'docx':
            case 'pdf':
            case 'xls':
            case 'xlsx':
            case 'ppt':
            case 'pptx':
                fileType = 'text';
                break;
            default:
                fileType = 'outros';
        }
    }
    
    let typePrefix = 'outros';
    switch(fileType) {
        case 'image':
            typePrefix = 'imagem';
            break;
        case 'video':
            typePrefix = 'video';
            break;
        case 'audio':
            typePrefix = 'audio';
            break;
        case 'text':
            typePrefix = 'texto';
            break;
    }
    
    return `${typePrefix}_${timestamp}`;
};

const FilesModal = ({ open, onClose, fileListId, reload }) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialState = {
        message: "",
        options: [{ file: null, message: "" }],
    };

    const [fileList, setFileList] = useState(initialState);

    useEffect(() => {
        try {
            (async () => {
                if (!fileListId) return;

                const { data } = await api.get(`/files/${fileListId}`);
                setFileList(data);
            })()
        } catch (err) {
            toastError(err);
        }
    }, [fileListId, open]);

    const handleClose = () => {
        setFileList(initialState);
        setIsSubmitting(false);
        onClose();
    };

    const handleSaveFileList = async (values) => {
        setIsSubmitting(true);
        
        const uploadFiles = async (options, filesOptions, id) => {
            const formData = new FormData();
            formData.append("fileId", id);
            formData.append("typeArch", "fileList")
            filesOptions.forEach((fileOption, index) => {
                if (fileOption.file) {
                    formData.append("files", fileOption.file);
                    formData.append("mediaType", fileOption.file.type);
                    formData.append("name", generateFileName(fileOption.file));
                    formData.append("id", options[index].id);
                }
            });
      
            try {
                const { data } = await api.post(`/files/uploadList/${id}`, formData);
                return data;
            } catch (err) {
                toastError(err);
                throw err; // Propaga o erro para ser tratado no catch externo
            }
        }

        try {
            // Remove o campo name do objeto antes de enviar
            const { name, ...fileDataWithoutName } = values;
            const fileData = { ...fileDataWithoutName, userId: user.id };
            
            let data;
            if (fileListId) {
                data = await api.put(`/files/${fileListId}`, fileData);
                if (data.data.options.length > 0) {
                    await uploadFiles(data.data.options, values.options, fileListId);
                }
            } else {
                data = await api.post("/files", fileData);
                if (data.data.options.length > 0) {
                    await uploadFiles(data.data.options, values.options, data.data.id);
                }
            }
            
            toast.success(i18n.t("fileModal.success"));
            if (typeof reload === 'function') {
                reload();
            }
            handleClose();
        } catch (err) {
            toastError(err);
            setIsSubmitting(false);
        }
    };

    return (
        <div className={classes.root}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                scroll="paper">
                <DialogTitle id="form-dialog-title">
                    {(fileListId ? `${i18n.t("fileModal.title.edit")}` : `${i18n.t("fileModal.title.add")}`)}
                </DialogTitle>
                <Formik
                    initialValues={fileList}
                    enableReinitialize={true}
                    validationSchema={FileListSchema}
                    onSubmit={(values, actions) => {
                        setTimeout(() => {
                            handleSaveFileList(values);
                            actions.setSubmitting(false);
                        }, 400);
                    }}
                >
                    {({ touched, errors, isSubmitting, values }) => (
                        <Form>
                            <DialogContent dividers>
                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("fileModal.form.message")}
                                        type="message"
                                        multiline
                                        minRows={5}
                                        fullWidth
                                        name="message"
                                        error={touched.message && Boolean(errors.message)}
                                        helperText={touched.message && errors.message}
                                        variant="outlined"
                                        margin="dense"
                                    />
                                </div>
                                <Typography
                                    style={{ marginBottom: 8, marginTop: 12 }}
                                    variant="subtitle1"
                                >
                                    {i18n.t("fileModal.form.fileOptions")}
                                </Typography>

                                <FieldArray name="options">
                                    {({ push, remove }) => (
                                        <>
                                            {values.options &&
                                                values.options.length > 0 &&
                                                values.options.map((option, index) => (
                                                    <div
                                                        className={classes.extraAttr}
                                                        key={`${index}-option`}
                                                    >
                                                        <Grid container spacing={2}>
                                                            <Grid xs={12} md={12} item>
                                                                <Field
                                                                    as={TextField}
                                                                    label="Mensagem do arquivo"
                                                                    name={`options.${index}.message`}
                                                                    error={touched.options?.[index]?.message && Boolean(errors.options?.[index]?.message)}
                                                                    helperText={touched.options?.[index]?.message && errors.options?.[index]?.message}
                                                                    variant="outlined"
                                                                    margin="dense"
                                                                    fullWidth
                                                                    multiline
                                                                    minRows={2}
                                                                />
                                                            </Grid>
                                                            <Grid xs={12} md={12} item>
                                                                <Field
                                                                    name={`options.${index}.file`}
                                                                    component={({ field, form }) => (
                                                                        <input
                                                                            type="file"
                                                                            onChange={(event) => {
                                                                                const file = event.currentTarget.files[0];
                                                                                form.setFieldValue(`options.${index}.file`, file);
                                                                            }}
                                                                            style={{ display: 'none' }}
                                                                            id={`file-input-${index}`}
                                                                        />
                                                                    )}
                                                                />
                                                                <label htmlFor={`file-input-${index}`}>
                                                                    <Button
                                                                        variant="outlined"
                                                                        component="span"
                                                                        startIcon={<AttachFileIcon />}
                                                                    >
                                                                        {option.file ? option.file.name : "Selecionar arquivo"}
                                                                    </Button>
                                                                </label>
                                                                {touched.options?.[index]?.file && errors.options?.[index]?.file && (
                                                                    <Typography color="error" variant="caption">
                                                                        {errors.options[index].file}
                                                                    </Typography>
                                                                )}
                                                            </Grid>
                                                            <Grid xs={12} md={12} item style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                <IconButton
                                                                    onClick={() => remove(index)}
                                                                    disabled={values.options.length === 1}
                                                                >
                                                                    <DeleteOutlineIcon />
                                                                </IconButton>
                                                            </Grid>
                                                        </Grid>
                                                        <Divider style={{ margin: '16px 0' }} />
                                                    </div>
                                                ))}
                                            <Button
                                                onClick={() => push({ file: null, message: "" })}
                                                variant="outlined"
                                                style={{ marginTop: 8 }}
                                            >
                                                Adicionar arquivo
                                            </Button>
                                        </>
                                    )}
                                </FieldArray>
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={handleClose}
                                    color="secondary"
                                    disabled={isSubmitting}
                                >
                                    {i18n.t("fileModal.buttons.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    variant="contained"
                                    className={classes.btnWrapper}
                                    disabled={isSubmitting}
                                >
                                    {i18n.t("fileModal.buttons.ok")}
                                    {isSubmitting && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </Dialog>
        </div>
    );
};

export default FilesModal;