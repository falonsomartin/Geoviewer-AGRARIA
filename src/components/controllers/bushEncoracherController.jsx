import { Card, CardContent, FormControl, Icon, IconButton, InputLabel, MenuItem, Select, Slide, Typography } from '@material-ui/core';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import emitter from '@utils/events.utils';
import React from 'react';

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
        backgroundColor: 'rgb(138, 213, 137)'
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
};

class BushEncroacher extends React.Component {
    state = {
        open: false,
        assets: [], // Aquí guardaremos los assets de GEE
        selectedSpecies: '', // Aquí guardamos la especie seleccionada
        selectedAsset: '', // Aquí guardamos el asset seleccionado por el usuario
        speciesOptions: [], // Lista de especies para el primer selector
        filteredAssets: [], // Lista de assets filtrados según la especie seleccionada
    }

    componentDidMount() {
        this.fetchAssets();  // Cargar los assets de GEE

        this.openBushEncroacherControllerListener = emitter.addListener('openBushEncoracherController', () => {
            this.setState({ open: true });
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({ open: false });
        });
    }

    fetchAssets = async () => {
        try {
            const response = await fetch('http://localhost:5004/api/list-assets');
            const data = await response.json();
            const assets = data.assets;

            // Obtener las especies disponibles
            const speciesOptions = this.getSpeciesOptions(assets);
            console.log(assets)
            this.setState({ assets: assets, speciesOptions: speciesOptions });
        } catch (error) {
            console.error('Error fetching assets:', error);
        }
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

    getSpeciesOptions = (assets) => {
        const speciesSet = new Set();

        // Extraer las especies basadas en los IDs de los assets
        assets.forEach(asset => {
            const id = asset.id;
            if (id.includes('_avg')) {
                const species = id.split('_')[0] +'_' + id.split('_')[1]; // Obtener la especie antes del primer '_'
                speciesSet.add(species);
            } else {
                speciesSet.add('Others');
            }
        });

        return Array.from(speciesSet); // Convertir el Set en una lista
    };

    handleSpeciesChange = (event) => {
        const selectedSpecies = event.target.value;
        this.setState({ selectedSpecies: selectedSpecies });

        // Filtrar los assets basados en la especie seleccionada
        this.filterAssetsBySpecies(selectedSpecies);
    };

    filterAssetsBySpecies = (species) => {
        let filteredAssets;
        if (species === 'Others') {
            filteredAssets = this.state.assets.filter(asset => !asset.id.includes('_avg'));
        } else {
            filteredAssets = this.state.assets.filter(asset => this.splitAssetName(asset.id).includes(species));
        }

        this.setState({ filteredAssets: filteredAssets });
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

    parseLayerName = (name) => {
        console.log(name)
        if (name.endsWith('_avg')) {
            const parts = name.split('_');
            console.log(parts)
            if (parts.length === 3) {
                return 'Current'; // e.g., "Rhigozum_trichotomum_avg" -> "Current"
            } else if (parts.length === 5) {
                const rcp = parts[2];
                const year = '20' + parts[3];
                return `RCP${rcp} ${year}`; // e.g., "Rhigozum_trichotomum_26_50_avg" -> "RCP26 2050"
            }
        }
        return name; // Si no coincide con los patrones, devolver el nombre original
    };

    fetchMapUrl = async (assetId, assetType) => {
        try {
            const response = await fetch('http://localhost:5004/api/get-map-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ asset_id: assetId, asset_type: assetType }),
            });
            const data = await response.json();
            this.setState({ mapUrl: data.map_url });
            emitter.emit('moveURL', data.map_url);  // Emitir evento para Canvas
            emitter.emit('closeAllController');
            emitter.emit('openLayerController');

        } catch (error) {
            console.error('Error fetching map URL:', error);
        }
    };

    componentWillUnmount() {
        emitter.removeListener(this.openBushEncroacherControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.setMapZoomListener);
        emitter.removeListener(this.handleDatasetRemoveListener);
    }

    render() {
        return (
            <MuiThemeProvider theme={GlobalStyles}>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ fontFamily: 'Lato, Arial, sans-serif', color:'white', fontWeight:'3' }} variant="h5" component="h2">Visualizador de capas</Typography>
                            <Typography variant="body2" color="textSecondary">Visualiza diferentes capas</Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>

                        <CardContent style={styles.content}>
                            <FormControl style={styles.select}>
                                <InputLabel>Tipo</InputLabel>
                                <Select
                                    value={this.state.selectedSpecies}
                                    onChange={this.handleSpeciesChange}
                                >
                                    {this.state.speciesOptions.map(species => (
                                        <MenuItem key={this.splitAssetName(species)} value={this.splitAssetName(species)}>{this.splitAssetName(species).replace("_"," ")}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl style={styles.select} disabled={!this.state.selectedSpecies}>
                                <InputLabel>Capa a visualiz.</InputLabel>
                                <Select
                                    value={this.state.selectedAsset}
                                    onChange={this.handleAssetChange}
                                >
                                    {this.state.filteredAssets.map(asset => (
                                        <MenuItem key={asset.id} value={{ id: asset.id, type: asset.type }}>
                                            {this.parseLayerName(this.splitAssetName(asset.id)).replace("_", " ")}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </CardContent>
                    </Card>
                </Slide>
            </MuiThemeProvider>
        );
    }
}

export default BushEncroacher;