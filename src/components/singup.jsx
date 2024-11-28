/* Written by Ye Liu */

import React from 'react';
import md5 from 'md5';

import Dialog from '@material-ui/core/Dialog';
import Slide from '@material-ui/core/Slide';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
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

class SignUp extends React.Component {
    state = {
        open: false,
        remember: false,
        logining: false
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

    handleLoginClick = async () => {
        // Show button progress
        this.setState({
            logining: true
        });

        const newUser = {
            idUser: 1,
            password: md5(document.getElementById('password').value),
            fullName: 'John Doe',
            email: document.getElementById('username').value,
            cellphone: '1234567890',
            birthdate: '1990-01-01',
            role: 'user',
          };
        // Generate request parameters
        const response = await axios.post(
            "http://localhost:9000/api/v1/users",
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
        }
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
            <MuiThemeProvider theme={theme}>
                <Dialog open={this.state.open} TransitionComponent={Transition} onClose={this.handleLoginClose}>
                    <div style={styles.loginContainer}>
                        <Typography style={styles.title} variant="h5" gutterBottom>Inicio de Sesión</Typography>
                        <TextField
                            style={styles.inputBox}
                            variant="outlined"
                            margin="dense"
                            id="username"
                            label="Username"
                        />
                        <TextField
                            style={styles.inputBox}
                            variant="outlined"
                            margin="dense"
                            id="password"
                            type="password"
                            label="Password"
                        />
                        <FormControlLabel
                            style={styles.checkBox}
                            control={
                                <Checkbox
                                    checked={this.state.remember}
                                    onChange={this.handleRememberChange}
                                    value="remember"
                                    color="primary"
                                />
                            }
                            label="Remember me"
                        />
                        <div style={styles.loginBtnContainer}>
                            <Button style={styles.loginBtn} variant="contained" color="primary" disabled={this.state.logining} onClick={this.handleLoginClick}>INICIAR SESIÓN</Button>
                            {this.state.logining && <CircularProgress style={styles.loginBtnProgress} size={24} />}
                        </div>
                    </div>
                </Dialog>
            </MuiThemeProvider>
        );
    }
}

export default SignUp;
