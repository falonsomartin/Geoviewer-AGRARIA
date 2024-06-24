/* Written by Ye Liu */

import { Avatar, Card, CardContent, Chip, FormControl, Icon, IconButton, Input, InputLabel, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, MenuItem, Select, Slide, Tooltip, Typography } from '@material-ui/core';

import { indigo } from '@material-ui/core/colors';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import React from 'react';
import Sortable from 'sortablejs';
import Slider from '@material-ui/core/Slider';
import emitter from '@utils/events.utils';

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
        width: 300,
        borderRadius: 4,
        margin: 0,
        zIndex: 900
    },
    header: {
        backgroundColor: '#f1f1f1'
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
    placeholder: {
        height: 28,
        lineHeight: '28px',
        cursor: 'pointer'
    },
    chipContainer: {
        display: 'flex',
        overflow: 'hidden'
    },
    chip: {
        height: 28,
        lineHeight: '28px',
        marginRight: 5
    },
    layerList: {
        marginTop: 6,
        paddingBottom: 0
    },
    layerItem: {
        paddingLeft: 2
    },
    sortAction: {
        right: 12
    }
};

class LayerController extends React.Component {
    state = {
        open: false,
        selected: [],
        resolution: 7,
        zoom: 0,
        layerForm:'Border',
        datasets:{}
    }

    handleCloseClick = () => {
        this.setState({
            open: false
        });
    }

    handleDatasetChange = async (e) => {
        // Check if deleting dataset
        var deleting = false;
        this.state.selected.map(item => {
            if (e.target.value.indexOf(item) === -1) {
                emitter.emit('removeDataset', item);
                deleting = true;
            }
            return true;
        });
        

        // Load dataset
        if (!deleting && e.target.value.length) {
            // Get dataset id
            const id = e.target.value[e.target.value.length - 1];

            // Display snackbar
            emitter.emit('showSnackbar', 'default', `Downloading dataset '${id}'.`);
            emitter.emit('displayDataset', id, this.state.datasets[id].data, '#f08');
            emitter.emit('showSnackbar', 'success', `Dataset '${id}' downloaded successfully.`);
                
            
        }

        // Save selected datasets
        this.setState({
            selected: e.target.value.reverse()
        });
    };

    

    handleLayerListUpdate = (e) => {
        // Update chips
        const selected = this.state.selected;
        const removed = selected.splice(e.oldIndex, 1);
        const length = selected.push(0);
        for (var i = length - 1; i > e.newIndex; i--) {
            selected[i] = selected[i - 1];
        }
        selected[e.newIndex] = removed[0];

        // Move layer
        emitter.emit('moveLayer', selected[e.newIndex], e.newIndex > 0 ? selected[e.newIndex - 1] : null);

        this.setState({
            selected: this.state.selected
        });
    }

    handleResolutionChange = (event, newValue) => {
        this.setState({ resolution: newValue });
    }

    componentDidMount() {
        // Bind event listeners
        this.openLayerControllerListener = emitter.addListener('openLayerController', () => {
            this.setState({
                open: true
            });
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({
                open: false
            });
        });

        this.setMapZoomListener = emitter.addListener('setMapZoom', (z) => {
            this.setState({
                zoom:z
            });
        });

        this.handleDatasetRemoveListener = emitter.addListener('handleDatasetRemove', () => {
            this.handleDatasetRemove();
        });

        emitter.on('moveDataset', this.handleDataMoved);

    }
    handleDataMoved = (movedData) => {
        console.log('Received moved data:', movedData);
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.setState({ datasets: movedData });
    }

    handleDatasetRemove()  {
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.setState({ datasets: {}, selected: {} });
    }

    componentDidUpdate() {
        // Initialize sortable list
        if (document.getElementById('layers')) {
            Sortable.create(document.getElementById('layers'), {
                group: 'layers',
                handle: '.handle',
                animation: 200,
                onUpdate: this.handleLayerListUpdate
            });
        }
    }

    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.openLayerControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.setMapZoomListener);
        emitter.removeListener(this.handleDatasetRemoveListener);
    }

    handleLayerFormBor = () => {
        this.setState({
            layerForm: 'Border'
        });
    }

    handleLayerFormHex = () => {
        this.setState({
            layerForm: 'Hexagonal'
        });
    }

    render() {
        console.log(this.state.datasets)
        return (
            <MuiThemeProvider theme={theme}>
                <Slide direction="left" in={this.state.open}>  
         
                    <Card style={styles.root}>
                        {/* Card header */}
                        <CardContent style={styles.header}>
                            <Typography gutterBottom variant="h5" component="h2">Layers</Typography>
                            <Typography variant="body2" color="textSecondary">Download and display layers</Typography>
                            <Tooltip title="Hexagons" aria-label="Hexagons" enterDelay={200}>
                            <IconButton aria-label="Hexagons" onClick={this.handleLayerFormHex}> 
                            <Icon fontSize="inherit">crop</Icon>
                            </IconButton> 
                            </Tooltip>

                            <Tooltip title="Border" aria-label="Border" enterDelay={200} onClick={this.handleLayerFormBor}>
                            <IconButton aria-label="Border"> 
                            <Icon fontSize="inherit">border_style</Icon>
                            </IconButton>
                            </Tooltip>
 
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={this.handleCloseClick}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>
                        {this.state.layerForm === 'Hexagonal' ?  
                        <CardContent style={this.state.selected.length ? styles.content : null}>
                            <FormControl style={styles.select}>
                            <InputLabel shrink htmlFor="resolution-label">Resolution</InputLabel>
                                &nbsp;&nbsp;&nbsp;                    
                                <Slider  // Añade el control deslizante
                                    value={this.state.resolution}
                                    min={1}
                                    max={15}
                                    step={1}
                                    onChange={this.handleResolutionChange}
                                />
                                <Select
                                    multiple
                                    displayEmpty
                                    value={this.state.selected}
                                    onChange={this.handleDatasetChange}
                                    input={<Input id="dataset-label" />}
                                    renderValue={selected => (
                                        selected.length ?
                                            <div style={styles.chipContainer}>
                                                {selected.map(item => (
                                                    <Chip key={item} style={styles.chip} label={item} />
                                                ))}
                                            </div> :
                                            <InputLabel style={styles.placeholder}>Choose layers</InputLabel>
                                    )}
                                >
                                    {Object.keys(this.state.datasets).map(item => (
                                        <MenuItem key={item} value={item}>
                                            <ListItemText primary={item} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {this.state.selected.length ?
                                <List id="layers" style={styles.layerList}>
                                    {this.state.selected.map(item => (
                                        <ListItem style={styles.layerItem} key={item}>
                                            <ListItemAvatar>
                                                <Avatar>
                                                    <Icon color="action">layers</Icon>
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText primary={item} />
                                            <ListItemSecondaryAction style={styles.sortAction}>
                                                <IconButton className="handle" edge="end" aria-label="Sort" disableRipple disableFocusRipple>
                                                    <Icon>menu</Icon>
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                                : null}
                        </CardContent>
                        
                    : <CardContent style={this.state.selected.length ? styles.content : null}>
                    <FormControl style={styles.select}>
                        <Select
                            multiple
                            displayEmpty
                            value={this.state.selected}
                            onChange={this.handleDatasetChange}
                            input={<Input id="dataset-label" />}
                            renderValue={selected => (
                                selected.length ?
                                    <div style={styles.chipContainer}>
                                        {selected.map(item => (
                                            <Chip key={item} style={styles.chip} label={item} />
                                        ))}
                                    </div> :
                                    <InputLabel style={styles.placeholder}>Choose layers</InputLabel>
                            )}
                        >
                            {Object.keys(this.state.datasets).map(item => (
                                <MenuItem key={item} value={item}>
                                    <ListItemText primary={item} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {this.state.selected.length ?
                        <List id="layers" style={styles.layerList}>
                            {this.state.selected.map(item => (
                                <ListItem style={styles.layerItem} key={item}>
                                    <ListItemAvatar>
                                        <Avatar>
                                            <Icon color="action">layers</Icon>
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={item} />
                                    <ListItemSecondaryAction style={styles.sortAction}>
                                        <IconButton className="handle" edge="end" aria-label="Sort" disableRipple disableFocusRipple>
                                            <Icon>menu</Icon>
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                        : null}
                </CardContent>}
                    </Card>
                </Slide>
            </MuiThemeProvider>
        );
    }
}

export default LayerController;