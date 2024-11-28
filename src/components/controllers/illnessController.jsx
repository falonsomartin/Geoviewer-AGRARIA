import React from 'react';
import { Card, CardContent, Icon, IconButton, Slide, Typography } from '@material-ui/core';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Plot from 'react-plotly.js';
import emitter from '@utils/events.utils'; // Asegúrate de importar el manejador de eventos
import IllnessModelStepper from '../componentsJS/IllnessStepperData';

const theme = createTheme({
    palette: {
        primary: { main: '#8ad589' }
    }
});

const styles = {
    root: {
        position: 'fixed',
        top: 74,
        right: 10,
        borderRadius: 4,
        minWidth: 350,
        margin: 0,
        width: 900,
        zIndex: 900
    },
    header: {
        backgroundColor: '#8ad589'
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 22
    }
};

class IllnessController extends React.Component {
    state = {
        open: true,
        data: [],
        loading: true
    };

    componentDidMount() {
        // Event listeners
        this.openIllnessControllerListener = emitter.addListener('openIllnessController', () => {
            this.setState({ open: true });
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({ open: false });
        });

        // Fetch data
        fetch('http://localhost:5003/illness_model')
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    console.log(result)
                    this.setState({ data: result.data, loading: false });
                }
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.openIllnessControllerListener);
        emitter.removeListener(this.closeAllControllerListener);

        // Destroy Materialbox if needed
        const elems = document.querySelectorAll('.materialboxed');
        elems.forEach(elem => elem.destroy && elem.destroy());
    }

    processData() {
        const { data } = this.state;

        const traces = [];
        const uniqueVariables = Object.keys(data[0] || {}).filter(
            key => key !== 'sampling_date' && key !== 'illness_name'
        );

        uniqueVariables.forEach(variable => {
            traces.push({
                x: data.map(item => item.sampling_date),
                y: data.map(item => item[variable]),
                type: 'scatter',
                mode: 'lines+markers',
                name: variable.replace(/_/g, ' ').toUpperCase() // Format variable name
            });
        });

        return traces;
    }

    render() {
        const { open, loading } = this.state;

        return (
            <ThemeProvider theme={theme}>
                <Slide direction="left" in={open}>
                    <Card style={styles.root}>
                        <CardContent style={styles.header}>
                            <Typography variant="h5" style={{ color: 'white' }}>Modelos de Enfermedades</Typography>
                            <IconButton style={styles.closeBtn} onClick={() => this.setState({ open: false })}>
                                <Icon>chevron_right</Icon>
                            </IconButton>
                        </CardContent>
                        <CardContent>
                           <IllnessModelStepper/>
                        </CardContent>
                    </Card>
                </Slide>
            </ThemeProvider>
        );
    }
}

export default IllnessController;