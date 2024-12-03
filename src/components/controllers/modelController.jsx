import React from 'react';
import { Card, CardContent, Icon, IconButton, Slide, Typography } from '@material-ui/core';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import indigo from '@material-ui/core/colors/indigo';
import Plot from 'react-plotly.js';
import emitter from '@utils/events.utils'; // Asegúrate de importar el manejador de eventos

const theme = createTheme({
    palette: {
        primary: {
            main: indigo.A200
        }
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
        backgroundColor: 'rgb(138, 213, 137)'
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 22
    }
};

class ModelController extends React.Component {
    state = {
        open: false,
        data: [], // Datos del backend
        loading: true
    };

    componentDidMount() {
        this.fetchData();

        // Configurar event listeners
        this.openModelControllerListener = emitter.addListener('openModelController', () => {
            this.setState({ open: true });
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({ open: false });
        });

        this.updatePointListener = emitter.addListener('updatePoint', (data) => {
            console.log('Actualización de punto recibida:', data);
        });

        this.addPointListener = emitter.addListener('addPoint', () => {
            console.log('Agregar punto activado');
        });
    }

    componentWillUnmount() {
        // Eliminar event listeners
        emitter.removeListener(this.openModelControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.addPointListener);
        emitter.removeListener(this.updatePointListener);
    }

    fetchData = () => {
        fetch('http://localhost:5004/api/watsat', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log(data); // Verifica los datos recibidos
                this.setState({
                    data,
                    loading: false
                });
            })
            .catch(error => {
                console.error('Error al obtener datos:', error);
            });
    };

    processPlotData = () => {
        const { data } = this.state;

        if (!data || data.length === 0) {
            return { traces: [], layout: {} };
        }

        // Procesar datos para el gráfico
        const meses = data.map(item => item.Mes);
        const contenidoAgua = data.map(item => item.Contenido_Agua_Suelo);
        const humedadRelativa = data.map(item => item.Humedad_Relativa);

        // Crear trazas
        const traceBarras = {
            x: meses,
            y: contenidoAgua,
            type: 'bar',
            name: 'Contenido Volumétrico de Agua (%)',
            marker: { color: 'blue' }
        };

        const traceLinea = {
            x: meses,
            y: humedadRelativa,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Humedad Relativa (%)',
            line: { color: 'red' }
        };

        // Configurar layout
        const layout = {
            title: 'Contenido Volumétrico de Agua y Humedad Relativa',
            xaxis: { title: 'Meses', type: 'category' },
            yaxis: { title: 'Porcentaje (%)' },
            legend: { orientation: 'h', x: 0.1, y: -0.2 },
            barmode: 'group'
        };

        return { traces: [traceBarras, traceLinea], layout };
    };

    render() {
        const { loading } = this.state;

        // Generar trazas y layout para Plotly
        const { traces, layout } = this.processPlotData();

        return (
            <ThemeProvider theme={theme}>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        {/* Cabecera de la tarjeta */}
                        <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color:'white', fontWeight:'3' }} variant="h5" component="h2">Modelo Watsat</Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>

                        {/* Contenido del gráfico */}
                        <CardContent>
                            {loading ? (
                                <p>Cargando datos...</p>
                            ) : (
                                <Plot data={traces} layout={layout} style={{ width: '100%' }} />
                            )}
                        </CardContent>
                    </Card>
                </Slide>
            </ThemeProvider>
        );
    }
}

export default ModelController;