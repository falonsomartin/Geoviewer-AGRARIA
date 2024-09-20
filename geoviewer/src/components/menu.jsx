/* Written by Ye Liu */

import React from 'react';

import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import Icon from '@material-ui/core/Icon';
import emitter from '@utils/events.utils';
import '@styles/menu.style.css';
const styles = {
    root: {
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 1000
    }
};

class Menu extends React.Component {
    state = {
        open: false,
        actions: [
            {
                name: 'Sync database',
                icon: <Icon>publish</Icon>,
                color: "green",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openSyncController')
                    this.handleClose();
                }
            },
            {
                name: 'Import data',
                icon: <Icon>import_export</Icon>,
                color: "pink",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openImportController')
                    this.handleClose();
                }
            },
            {
                name: 'Pick data',
                icon: <Icon>insert_chart</Icon>,
                color: "blue",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openDataController');
                    this.handleClose();
                }
            },
            {
                name: 'Switch style',
                icon: <Icon>brush</Icon>,
                color: "red accent-2",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openStyleController');
                    this.handleClose();
                }
            },

            {
                name: 'Collect indexes',
                icon: <Icon>satellite</Icon>,
                color: "grey",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openBandController');
                    this.handleClose();
                }
            },
            {
                name: 'Search crop',
                icon: <Icon>search</Icon>,
                color: "leaf green",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openSearchController');
                    this.handleClose();
                }
            },
            {
                name: 'Illness Models',
                icon: <Icon>emoji_nature</Icon>,
                color: "purple",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openIllnessController');
                    this.handleClose();
                }
            },
            {
                name: 'Models',
                icon: <Icon>psychology</Icon>,
                color: "purple darken-1",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openModelController');
                    this.handleClose();
                }
            },
            {
                name: 'Production model',
                icon: <Icon>online_prediction</Icon>,
                color: "orange",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openDitwinController');
                    this.handleClose();
                }
            },
            {
                name: 'Configure layers',
                icon: <Icon>layers</Icon>,
                color: "yellow darken-1",
                callback: () => {
                    emitter.emit('closeAllController');
                    emitter.emit('openLayerController');
                    this.handleClose();
                }
            }
        ]
    }

    handleClick = () => {
        this.setState(state => ({
            open: !state.open,
        }));
    }

    handleOpen = () => {
        this.setState({
            open: true
        });
    }

    handleClose = () => {
        this.setState({
            open: false
        });
    }

    componentDidMount() {
        // Bind event listener
        this.openMenuListener = emitter.addListener('openMenu', () => {
            this.setState({
                open: true
            });
        });
    }

    componentWillUnmount() {
        // Remove event listener
        emitter.removeListener(this.openMenuListener);
    }

    render() {
        return (
            <SpeedDial
                style={styles.root}
                open={this.state.open}
                ariaLabel="Menu"
                icon={<SpeedDialIcon icon={<Icon>menu</Icon>} openIcon={<Icon>clear</Icon>} />}
                onMouseEnter={this.handleOpen}
                onMouseLeave={this.handleClose}
                onClick={this.handleClick}
            >
                {this.state.actions.map(action => {
                    return (
                        <SpeedDialAction
                            key={action.name}
                            className={action.color}
                            icon={action.icon}
                            tooltipTitle={action.name}
                            onClick={action.callback} />
                    );
                })}
            </SpeedDial>
        );
    }
}

export default Menu;
