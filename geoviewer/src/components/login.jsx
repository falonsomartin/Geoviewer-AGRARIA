/* Written by Ye Liu */

import React from 'react';
import md5 from 'md5';

import Dialog from '@material-ui/core/Dialog';
import Slide from '@material-ui/core/Slide';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import indigo from '@material-ui/core/colors/indigo';
import axios from "axios";

import emitter from '@utils/events.utils';

const theme = createTheme({
    palette: {
        primary: {
            main: indigo.A200
        }
    }
});

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
        mode: 'login'
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

    handleLoginClick = async () => {
        // Show button progress
        this.setState({
            logining: true
        });

        const newUser = {
            idUser: 1,
            username: document.getElementById('username').value,
            password: md5(document.getElementById('password').value),
            role: 'base',
          };
        // Generate request parameters
        const response = await axios.post(
            "http://localhost:5000/login",
            newUser
          );

        console.log(response)

        if(response.status===200){
            emitter.emit('showSnackbar', 'success', `User '${response.status}' login successfully.`);
            emitter.emit('setLoginState', true);
            this.setState({
                open: false
            });
            
            this.setState({
                logining: false
           });

        }else{

        }

        

        // Initiate request
        //request({
        //    url: SERVICE.login.url,
        //    method: SERVICE.login.method,
        //    params: params,
        //    successCallback: (res) => {
                // Show snackbar
        //        emitter.emit('showSnackbar', 'success', `User '${res.user}' login successfully.`);

                // Switch login icon
        //        emitter.emit('setLoginState', true);

        //        this.setState({
        //            open: false
        //        });
        //    },
        //    finallyCallback: () => {
        //        this.setState({
        //            logining: false
        //       });
        //    }
        //});
    }

    componentDidMount() {
        // Bind event listener
        this.loginListener = emitter.addListener('login', () => {
            this.setState({
                open: true
            });
        });
    }

    componentWillUnmount() {
        // Remove event listener
        emitter.removeListener(this.loginListener);
    }

    render() {
    
        return (
            <ThemeProvider theme={theme}>
                <Dialog open={this.state.open} TransitionComponent={Transition} onClose={this.handleLoginClose}>
                    <div style={styles.loginContainer}>
                        {this.state.mode === 'login' ?                         
                        <><Typography style={styles.title} variant="h5" gutterBottom>Inicio de Sesión</Typography><TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="username"
                                label="Username" /><TextField
                                    style={styles.inputBox}
                                    variant="outlined"
                                    margin="dense"
                                    id="password"
                                    type="password"
                                    label="Password" /></>
 :                       <><Typography style={styles.title} variant="h5" gutterBottom>Registro</Typography>
                            <TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="username"
                                label="Username" />
                            <TextField
                                style={styles.inputBox}
                                variant="outlined"
                                margin="dense"
                                id="password"
                                type="password"
                                label="Password" />

                                
                            
                            
                            </>
}

                        <div style={styles.loginBtnContainer}>
                            <Button style={styles.loginBtn} variant="contained" color="primary" disabled={this.state.logining} onClick={this.handleLoginClick}>INICIAR SESIÓN</Button>
                            {this.state.logining && <CircularProgress style={styles.loginBtnProgress} size={24} />}
                            <Button style={styles.loginBtn} onClick={this.handleChangeForm} color="primary">
                            {this.state.mode === 'login' ? 'Login' : 'Register'}
                        </Button>
                        </div>
                    </div>
                </Dialog>
            </ThemeProvider>
        );
    }
}

export default Login;
