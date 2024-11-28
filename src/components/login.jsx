/* Written by Ye Liu */

import md5 from 'md5';
import React from 'react';

import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import Slide from '@material-ui/core/Slide';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import indigo from '@material-ui/core/colors/indigo';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import Autocomplete from '@material-ui/lab/Autocomplete';
import datasets from '@utils/dataset.utils';
import emitter from '@utils/events.utils';
import axios from "axios";


axios.defaults.baseURL = 'http://localhost:5000';  // Asegúrate de que la URL base es correcta
axios.defaults.withCredentials = true; // Importante para enviar cookies

const theme = createTheme({
    palette: {
        primary: {
            main: indigo.A200
        }
    }
});

const catastralList = ["41046A010000100000DU","41041A014001860000HF","41041A014001790000HQ", "41041A015002920000HF", "41041A015002760000HH", "41041A015002730000HS", "41041A014000920000HF", "41041A007003790000HK", "41041A005000430000HO"];

const apiUrl = 'http://localhost:5000';


axios.interceptors.request.use(
    config => {
      const { origin } = new URL(config.url);
      const allowedOrigins = [apiUrl];
      const token = localStorage.getItem('token');
      if (allowedOrigins.includes(origin)) {
        config.headers.authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

const styles = {
    loginContainer: {
        width: 300,
        height: 350,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        marginBottom: 20
    },
    inputBox: {
        width: 240,
        marginTop: 15
    },
    autocomplete: {
        width: 240,       
        display: 'flex',
        flexWrap: 'wrap',
        overflow: 'auto',
    },
    checkBox: {
        width: 140
    },
    loginBtnContainer: {
        display: 'inline-block',
        position: 'relative'
    },
    loginBtn: {
        width: 120,
        marginTop: 20
    },
    loginBtnProgress: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -3,
        marginLeft: -12,
    }
};



const Transition = React.forwardRef((props, ref) => {
    return <Slide direction="down" ref={ref} {...props} />;
});

class Login extends React.Component {
    state = {
        open: false,
        remember: false,
        logining: false,
        mode: 'login',
        selectedOptions:[],
        datasets:{}
    }

    handleLoginClose = () => {
        this.setState({
            open: false
        });
    }

    handleRememberChange = (e) => {
        this.setState({
            remember: e.target.checked
        });
    }

    handleChangeForm = (e) => {
        this.setState({
            mode: this.state.mode === 'login' ? 'Login' : 'Register'
        });
        console.log(this.state.mode)
    }

    handleChangeAutoComplete = (e, newValue) => {
        const updatedReferences = newValue.map(option => option.reference);
        this.setState({ selectedOptions: updatedReferences }, () => {
            console.log(this.state.selectedOptions);  // This will now output the updated state
          });
    };

    getUserParcels = async (userId) => {
        try {
            const response = await axios.get(`http://localhost:5000/users/${userId}/parcels`);
            if (response.status === 200) {
                this.updateDatasetUtilsFile(response.data);
                console.log("Parcelas recibidas:", response.data);
            } else {
                console.error("No se pudieron obtener las parcelas:", response.statusText);
            }
        } catch (error) {
            console.error("Error al obtener las parcelas:", error);
        }
    }

    updateDatasetUtilsFile(parcels) {
        parcels.forEach(parcel => {
            datasets[parcel.catastral_ref] = {
                data: parcel.geojson_data
            };
        });

        this.setState({
            datasets: datasets
        })
    
        console.log("Updated datasets:", this.state.datasets);

        emitter.emit('moveDataset', this.state.datasets);
    }    

    handleLoginClick = async () => {
        // Show button progress
        this.setState({
            logining: true
        });
        const newUser = {
            username: document.getElementById('username').value,
            password: md5(document.getElementById('password').value),
          };
        // Generate request parameters
        const response = await axios.post(
            "http://localhost:5000/login",
            newUser
          );


        if(response.status===200){
            const userID = response.data.message[0];
            const token = response.data.message[1];
            emitter.emit('handleToken', token); // Emitiendo el evento con los datos

            localStorage.removeItem('token'); 
            localStorage.removeItem('jwt');
            // Limpiar token anterior
            localStorage.setItem('token', token);  // Almacenar nuevo token

            emitter.emit('showSnackbar', 'success', `User login successfully.`);
            emitter.emit('setLoginState', true);

            this.getUserParcels(userID);

            // Actualizar el estado una sola vez
            this.setState({
                open: false,
                logining: false,
                idUser: userID
            });

            console.log(localStorage.getItem('token'))

        }else{

        }
    }


    moveDataset = () => {
        var datos = this.state.datasets
        this.setState({ movedData: datos });
        console.log(this.state.movedData)

    }

    componentDidMount() {
        // Bind event listener
        this.loginListener = emitter.addListener('login', () => {
            this.setState({
                open: true
            });
            
        });

        this.moveDatasetListener = emitter.addListener('moveDataset', () => {
            this.moveDataset();
        });
        
    }
    

    componentWillUnmount() {
        // Remove event listener
        emitter.removeListener(this.loginListener);
        emitter.removeListener(this.moveDatasetListener);

    }

    render() {
        return (
            <MuiThemeProvider theme={theme}>
                <Dialog open={this.state.open} TransitionComponent={Transition} onClose={this.handleLoginClose}>
                    <div style={styles.loginContainer}>
                        {this.state.mode === 'login' ?                         
                        <><Typography style={styles.title} variant="h5" gutterBottom>Inicio de Sesión</Typography><TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="username"
                                label="Usuario" /><TextField
                                    style={styles.inputBox}
                                    variant="outlined"
                                    margin="dense"
                                    id="password"
                                    type="password"
                                    label="Contraseña" /></>
 :                       <><Typography style={styles.title} variant="h5" gutterBottom>Registro</Typography>
                            <TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="username"
                                label="Usuario" />
                            <TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="password"
                                type="password"
                                label="Contraseña" />

                            <Autocomplete
                            style={styles.inputBox}
                            multiple
                            onChange={this.handleChangeAutoComplete}
                            limitTags={1}
                            id="checkboxes-tags-demo"
                            options={catastralList}
                            getOptionLabel={(option) => option}
                            renderOption={(option, { selected }) => (
                                <React.Fragment>
                                <Checkbox
                                    style={{ marginRight: 1, marginLeft:1 }}
                                    checked={selected}
                                />
                                {option}
                                </React.Fragment>
                            )}
                            renderInput={(params) => (
                                <TextField id="lista" {...params} variant="outlined" label="Checkboxes" placeholder="Favorites" />
                            )}

                            renderTags={() => null} // No renderizar tags en el TextField

                            />
                             </>
}

                        <div style={styles.loginBtnContainer}>
                            <Button style={styles.loginBtn} variant="contained" color="primary" disabled={this.state.logining} onClick={this.handleLoginClick}>INICIAR SESIÓN</Button>
                            {this.state.logining && <CircularProgress style={styles.loginBtnProgress} size={24} />}
                            <Button style={styles.loginBtn} onClick={this.handleChangeForm} color="primary">
                            {this.state.mode === 'login' ? 'Register' : 'Login'}
                        </Button>
                        </div>
                    </div>
                </Dialog>
            </MuiThemeProvider>
        );
    }
}

export default Login;
