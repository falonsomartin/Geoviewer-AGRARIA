import React from 'react';
import Slider from '@material-ui/core/Slider';
import emitter from '@utils/events.utils';
import { Card, CardContent, Checkbox, Icon, IconButton, List, ListItem, ListItemText, Slide, Tooltip, Typography } from '@material-ui/core';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';

const GlobalStyles = createTheme({
    typography: {
        fontFamily: 'Lato, Arial, sans-serif',
    },
    overrides: {
        MuiCssBaseline: {
            '@global': {
                body: {
                    fontFamily: 'Lato, Arial, sans-serif',
                },
            },
        },
    },
});

  

const styles = {
    root: {
        position: 'fixed',
        top: 74,
        right: 10,
        width: 300,
        borderRadius: 9,
        margin: 0,
        zIndex: 900,
        boxShadow: '-6px 6px 15px rgba(0, 0, 0, 0.15)',
    },
    header: {
        backgroundColor: 'rgba(253,216,53,255)'
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 22
    },
    content: {
        paddingBottom: 16
    },
    select: {
        width: '100%'
    },
    layerList: {
        marginTop: 6,
        paddingBottom: 0
    },
    layerItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 2,
        paddingRight: 5, // Ensure some space at the right
    },
    layerText: {
        flexGrow: 1,
        maxWidth: '120px', // Set a max width for the layer text
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    checkbox: {
        marginRight: '8px', // Add space between the checkbox and text
    },
    slider: {
        width: '80px', // Adjust the width of the slider
        marginLeft: '10px'
    },
    legend: {
        position: 'absolute',
        bottom: '30px',
        left: '10px',
        background: 'white',
        padding: '10px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '18px',
        color: '#333',
        borderRadius: '3px',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
    },
    legendTitle: {
        margin: '0 0 10px',
        fontSize: '14px'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '5px'
    },
    legendColorBox: {
        width: '20px',
        height: '10px',
        display: 'inline-block',
        marginRight: '5px'
    },
    spectralLegend: {
        position: 'absolute',
        bottom: '30px',
        left: '10px',
        background: 'white',
        padding: '10px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '18px',
        color: '#333',
        borderRadius: '3px',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
    }
};

class LayerController extends React.Component {
    state = {
        open: false,
        mapp: null,
        selected: {},
        resolution: 7,
        zoom: 0,
        layerForm: 'Border',
        datasets: {},
        layers: [],
        assets: [], // Aquí guardaremos los assets de GEE
        selectedAsset: '', // Aquí guardamos el asset seleccionado por el usuario
        mapUrl: '' // Aquí guardamos la URL del mapa generado

    }

    handleCloseClick = () => {
        this.setState({
            open: false
        });
    }

    truncateLayerName = (name) => {
        if (name.length > 7) {
            return name.substring(0, 4) + '...'; // Keep the first 10 characters and add '...'
        }
        return name; // Return the name as is if it's 13 characters or fewer
    }

    handleDatasetChange = async (e) => {
        var deleting = false;
        Object.keys(this.state.selected).map(item => {
            deleting = true;
            this.setState({
                selected: {}
            });
            return true;
        });

        if (!deleting && e.target.value.length) {
            const id = e.target.value[e.target.value.length - 1];
            emitter.emit('showSnackbar', 'default', `Downloading dataset '${id}'.`);
            emitter.emit('displayDataset', id, this.state.datasets[id].data, '#f08');
            emitter.emit('showSnackbar', 'success', `Dataset '${id}' downloaded successfully.`);
        }
    };

    handleShapeChange = (e) => {
        this.setState({ shape: e.target.value });
    }

    // Toggle visibility of a layer and emit event to canvas.jsx
    // Manejar el cambio de visibilidad
    handleLayerVisibilityChange = (layerId) => {
        const updatedLayers = this.state.layers.map(layer =>
            layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
        );
        this.setState({ layers: updatedLayers });

        // Emitimos un evento para cambiar la visibilidad de la capa en Canvas
        emitter.emit('toggleLayerVisibility', layerId, updatedLayers.find(layer => layer.id === layerId).visible);
    };

    // Manejar el cambio de transparencia
    handleTransparencyChange = (layerId, value) => {
        const updatedLayers = this.state.layers.map(layer =>
            layer.id === layerId ? { ...layer, transparency: value } : layer
        );
        this.setState({ layers: updatedLayers });

        // Emitimos un evento para cambiar la transparencia de la capa en Canvas
        emitter.emit('changeLayerTransparency', layerId, value / 100);  // Normalizamos de 0 a 1
    };


    // Función para cortar el nombre del asset después del "/0" o devolver el nombre si no lo tiene
    splitAssetName = (assetPath) => {
        const parts = assetPath.split('/'); // Dividimos el path por "/"
        let lastPart = parts[parts.length - 1]; // Tomamos la última parte del path
    
        // Si el nombre comienza con "0", lo removemos
        if (lastPart.startsWith('0')) {
            lastPart = lastPart.substring(1); // Eliminar el primer carácter ("0")
        }
        
        return lastPart; // Devolver la última parte procesada
    };


    handleDrop = (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result);
                const geoJsonData = data;

                // Add the new layer with default visibility and transparency
                const newLayer = { id: file.name, visible: true, transparency: 100 };

                // Update layers and datasets
                this.setState((prevState) => ({
                    datasets: { ...prevState.datasets, [file.name]: { data: geoJsonData } },
                    layers: [...prevState.layers, newLayer]
                }));

                emitter.emit('displayDataset', file.name, geoJsonData);
                emitter.emit('showSnackbar', 'success', `Dataset '${file.name}' added as a layer successfully.`);
            };
            reader.readAsText(file);
        }
    }; 

    componentDidMount() {

        this.openLayerControllerListener = emitter.addListener('openLayerController', () => {
            this.setState({ open: true });
        });

        this.newLayerListener = emitter.addListener('newLayer', (newLayer) => {
            this.setState((prevState) => ({
                layers: [...prevState.layers, newLayer]
            }));
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({ open: false });
        });

        this.setMapZoomListener = emitter.addListener('setMapZoom', (z) => {
            this.setState({ zoom: z });
        });

        this.handleDatasetRemoveListener = emitter.addListener('handleDatasetRemove', () => {
            this.handleDatasetRemove();
        });

        window.addEventListener('dragover', this.handleDragOver);
        window.addEventListener('drop', this.handleDrop);
    }

    componentDidUpdate(prevProps) {
        if (this.props.map !== prevProps.map) {
            this.updateDatasets();
        }
    }

    
getLegendContent = (layerId) => {
    if (layerId.includes('VICI')) {
        return (
            <div style={{ padding: '10px', textAlign: 'center' }}>
                <Typography><strong>Vegetation Change</strong> %/year</Typography>
                <div style={{ 
                    width: '100%', 
                    height: '20px', 
                    background: 'linear-gradient(to right, red, white, green)', 
                    margin: '10px 0', 
                    borderRadius: '5px' 
                }}>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">-2</Typography>
                    <Typography variant="body2">2</Typography>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Decline</Typography>
                    <Typography variant="body2">Increase</Typography>
                </div>
            </div>
        );
    } else if (layerId.includes('Erosion')) {
        return (
            <div>
                <Typography><strong>Soil Loss</strong> (t/hac/year)</Typography>
                                {['#490EFF', '#12F4FF', '#12FF50', '#E5FF12', '#FF4812'].map((color, index) => {
                    const labels = [
                        'Slight (<10)',
                        'Moderate (10-20)',
                        'High (20-30)',
                        'Very high (30-40)',
                        'Severe (>40)'
                    ];
                    return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '10px' }}></span>
                            <Typography>{labels[index]}</Typography>
                        </div>
                    );
                })}
            </div>
        );
    } else if (layerId.includes('DSM')) {
        return (
            <div>
                <Typography><strong>DSM</strong> (t/ha)</Typography>
                {['#ffffe5', '#fee391', '#fec44f', '#ec7014', '#8c2d04'].map((color, index) => {
                    const labels = [
                        '0 - 1.2',
                        '1.2 - 2.4',
                        '2.4 - 3.6',
                        '3.6 - 4.8',
                        '4.8 - 6'
                    ];
                    return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '10px' }}></span>
                            <Typography>{labels[index]}</Typography>
                        </div>
                    );
                })}
            </div>
        );
    } else if (layerId.includes('avg')) {
        return (
            <div>
                <Typography><strong>Habitat Suitability</strong></Typography>
                {['#ffffff', '#cceacc', '#66bf66', '#006600'].map((color, index) => {
                    const labels = [
                        'Unsuitable',
                        'Low suitability',
                        'Moderate suitability',
                        'High suitability'
                    ];
                    return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '10px' }}></span>
                            <Typography>{labels[index]}</Typography>
                        </div>
                    );
                })}
            </div>
        );
    }
};


    handleAssetChange = (event) => {
        const selectedAsset = event.target.value.id;  // Obtenemos el id del asset
        const selectedType = event.target.value.type;  // Obtenemos el tipo del asset
    
        this.setState({
            selectedAsset: selectedAsset,
            selectedAssetType: selectedType
        });
    
        // Obtener la URL del mapa del asset seleccionado
        this.fetchMapUrl(selectedAsset, selectedType);
    };
    

    handleDatasetRemove() {
        this.setState({ datasets: {}, selected: {} });
    }

    componentWillUnmount() {
        emitter.removeListener(this.openLayerControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.setMapZoomListener);
        emitter.removeListener(this.handleDatasetRemoveListener);
        emitter.removeListener(this.newLayerListener);  
        window.removeEventListener('dragover', this.handleDragOver);
        window.removeEventListener('drop', this.handleDrop);
    }

    render() {
        console.log(this.state.layers)
        return (
            <MuiThemeProvider theme={GlobalStyles}>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color:'white', fontWeight:'3' }} variant="h5" component="h2">Layers</Typography>
                            <Typography variant="body2" color="textSecondary">Manage and control layers</Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>

                        <CardContent style={styles.content}>

                            
                            <List id="layers" style={styles.layerList}>
                                                                {this.state.layers.map(layer => (
                                    <ListItem style={styles.layerItem} key={layer.id}>
                                        <ListItemText primary={
                                            <span style={styles.layerText}>
                                                <Tooltip
                                                    title={this.getLegendContent(layer.id)}
                                                    arrow
                                                >
                                                    <Icon fontSize="small">troubleshoot</Icon>
                                                </Tooltip>
						&nbsp;&nbsp;
						<Tooltip arrow title={this.splitAssetName(layer.id)} sx={{ fontSize: '1.2rem' }}>
                                                <span>{this.truncateLayerName(this.splitAssetName(layer.id))}</span>
						</Tooltip>
                                            </span>
                                        } />
                                        <Checkbox
                                            checked={layer.visible}
                                            onChange={() => this.handleLayerVisibilityChange(layer.id)}
                                            color="primary"
                                        />
                                        <Slider
                                            value={layer.transparency}
                                            onChange={(e, value) => this.handleTransparencyChange(layer.id, value)}
                                            min={0}
                                            max={100}
                                            style={styles.slider}
                                        />
			    <Tooltip title="Download this layer" aria-label="Download this layer" enterDelay={200}>
                                <IconButton className="icon-container modal-trigger" aria-label="Download this layer" color="inherit">
                                    <Icon style={styles.fontIcon}>download_icon</Icon>
                                </IconButton>
                            </Tooltip>
                                    </ListItem>
                                ))}
                            </List>

                        </CardContent>
                    </Card>
                </Slide>
            </MuiThemeProvider>
        );
    }
}

export default LayerController;
