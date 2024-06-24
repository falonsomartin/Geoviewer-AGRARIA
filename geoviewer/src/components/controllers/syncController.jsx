/* Written by Ye Liu */

import M from 'materialize-css';
import React from 'react';

import indigo from '@material-ui/core/colors/indigo';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Backdrop , CircularProgress, Typography} from '@material-ui/core';

import { ACCESS_TOKEN, SERVICE } from '@/config';
import emitter from '@utils/events.utils';
import { checkEmptyObject } from '@utils/method.utils';
import request from '@utils/request.utils';

import '@styles/dataController.style.css';


const theme = createTheme({
    palette: {
        primary: {
            main: indigo.A200
        }
    }
});

const styles = {
    root: {
        width: '100%',
        position: 'fixed',
        top: 64,
        bottom: 0
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
      },
      progressText: {
        marginLeft: theme.spacing(2),
      }
};

class SyncController extends React.Component {
    state = {
        open: false,
        resultUnwrap: false,
        addPointUnwrap: false,
        optionsOpen: false,
        searching: false,
        submitting: false,
        anchorEl: null,
        geometry: null,
        previewImage: null,
        previewMapUrl: null,
        previewCoordinate: {},
        data: [],
        searchOptions: [
            {
                value: 'gid',
                label: 'Gid',
                checked: true
            },
            {
                value: 'name',
                label: 'Name',
                checked: true
            },
            {
                value: 'pinyin',
                label: 'Pinyin',
                checked: true
            },
            {
                value: 'introduction',
                label: 'Introduction',
                checked: false
            }
        ],
        loading:false,
        timer:0
    }

    initMaterialbox = () => {
        var elems = document.querySelectorAll('.materialboxed');
        M.Materialbox.init(elems, {
            onOpenStart: (e) => {
                e.parentNode.style.overflow = 'visible';
            },
            onCloseEnd: (e) => {
                e.parentNode.style.overflow = 'hidden';
            }
        });
    }

    resetPreviewImage = () => {
        this.setState({
            previewImage: null
        });
    }

    resetNewPointData = () => {
        this.setState({
            previewMapUrl: null,
            geometry: null,
            previewCoordinate: {}
        });
    }

    handleCloseClick = () => {
        this.setState({
            open: false
        });
    }

    handleAddClick = () => {
        // Get GeoJSON from map
        emitter.emit('getPoint');

        // Exit search mode
        this.handleWrapClick();

        // Initialize new point data
        this.resetPreviewImage();
        this.resetNewPointData();

        // Wrap add point panel
        this.setState({
            addPointUnwrap: false
        });
    }

    handleWrapClick = () => {
        // Remove temp layer
        emitter.emit('removeTempLayer');

        // Reset preview image
        this.resetPreviewImage();

        // Clear search box
        document.getElementById('search-box').value = '';

        this.setState({
            resultUnwrap: false
        });
    }



    


    





    handleImageChange = (e) => {
        // Check if file selected
        if (!e.target.files[0]) {
            return;
        }

        // Check image size (smaller than 1MB)
        if (e.target.files[0].size > 1048576) {
            emitter.emit('showSnackbar', 'error', 'Error: Image must be smaller than 1MB.');
            return;
        }

        // Encode image with base64
        this.state.reader.readAsDataURL(e.target.files[0]);
    }

    handleDoneEdit = () => {
        // Reset preview image
        this.resetPreviewImage();

        // Initialize Materialbox
        setTimeout(this.initMaterialbox, 800);
    }

    handleSearchOptionsClick = () => {
        this.setState({
            optionsOpen: true
        });
    }

    handleSearchOptionsClose = () => {
        this.setState({
            optionsOpen: false
        });
    }

    
    handleSearchOptionChange = (e) => {
        // Update search options
        var option = null;
        var flag = false;
        this.state.searchOptions.map(item => {
            if (item.value === e.currentTarget.value) {
                item.checked = e.currentTarget.checked;
                option = item;
            }
            flag = flag || item.checked;
            return true;
        });

        // Check whether at least one option checked
        if (!flag) {
            emitter.emit('showSnackbar', 'error', 'Error: Please select at least one option.');
            option.checked = true;
            return;
        }

        this.setState({
            searchOptions: this.state.searchOptions
        });
    }

    handleSearchClick = () => {
        // Exit add point mode
        this.handleCancelClick();

        // Get keyword
        var keyword = document.getElementById('search-box').value;
        if (!keyword) {
            return;
        }

        // Show searching progress
        this.setState({
            searching: true
        });

        // Get search options
        var options = {};
        this.state.searchOptions.map(item => {
            options[item.value] = item.checked;
            return true;
        });

        // Initiate request
        request({
            url: SERVICE.search.url,
            method: SERVICE.search.method,
            params: {
                keyword: keyword,
                options: JSON.stringify(options)
            },
            successCallback: (res) => {
                // Display data
                this.setState({
                    addPointWrapperClose: false,
                    resultUnwrap: true,
                    data: res.data
                }, this.initMaterialbox);
            },
            finallyCallback: () => {
                // Show search button
                this.setState({
                    searching: false
                });
            }
        });
    }

    handlePreviewClick = (e, data) => {
        // Show marker and popup on map
        emitter.emit('displayTempLayer', data);
    }

    handlePreviewMapClick = () => {
        // Get GeoJSON from map
        emitter.emit('getPoint');

        this.setState({
            addPointUnwrap: false
        });
    }

    handleSubmitClick = () => {
        // Remove temp point
        emitter.emit('removeTempPoint');

        // Show button progress
        this.setState({
            submitting: true
        });

        // Generate request parameters
        var params = {
            name: document.getElementById('name').value,
            pinyin: document.getElementById('pinyin').value,
            introduction: document.getElementById('introduction').value,
            image: this.state.previewImage ? this.state.previewImage : {},
            geometry: this.state.geometry
        };

        // Initiate request
        request({
            url: SERVICE.insert.url,
            method: SERVICE.insert.method,
            params: params,
            successCallback: (res) => {
                // Show snackbar
                emitter.emit('showSnackbar', 'success', `Insert new object with Gid = '${res.gid}' successfully.`);

                this.handleCancelClick();
            },
            finallyCallback: () => {
                this.setState({
                    searching: false,
                    submitting: false
                });
            }
        });
    }

    handleCancelClick = () => {
        // Remove temp point
        emitter.emit('removeTempPoint');

        // Empty input box
        document.getElementById('name').value = '';
        document.getElementById('pinyin').value = '';
        document.getElementById('introduction').value = '';

        // Reset data
        this.resetPreviewImage();
        this.resetNewPointData();

        // Wrap add point panel
        this.setState({
            addPointUnwrap: false
        });
    }

    handleRowUpdate = (newData, oldData) => {
        return new Promise(resolve => {
            // Check if Gid changed
            if (oldData.gid !== newData.gid) {
                emitter.emit('showSnackbar', 'error', "Column 'Gid' is readonly.");
            }

            // Generate request parameters
            var params = {
                gid: oldData.gid
            };

            if (this.state.previewImage) {
                newData.image = this.state.previewImage;
            } else {
                newData.image = {};
            }

            Object.keys(newData).map(key => {
                if (key !== 'geometry' && newData[key] !== oldData[key]) {
                    params[key] = newData[key]
                }
                return true;
            });

            // return if nothing to update
            if (checkEmptyObject(params)) {
                emitter.emit('showSnackbar', 'default', 'Nothing to update.');
                return;
            }

            // Initiate request
            request({
                url: SERVICE.update.url,
                method: SERVICE.update.method,
                params: params,
                successCallback: (res) => {
                    // Show success snackbar
                    var message = `Update ${res.count} ${res.count > 1 ? 'objects' : 'object'} successfully.`;
                    emitter.emit('showSnackbar', 'success', message);

                    // Refresh table
                    var data = this.state.data;
                    data[data.indexOf(oldData)] = newData;
                    this.setState({
                        data: data
                    });
                },
                finallyCallback: () => {
                    // Resolve promise
                    resolve();

                    // Exit edit mode
                    this.handleDoneEdit();
                }
            });
        });
    }

    handleRowDelete = (oldData) => {
        return new Promise(resolve => {
            // Initiate request
            request({
                url: SERVICE.delete.url,
                method: SERVICE.delete.method,
                params: {
                    gid: oldData.gid
                },
                successCallback: (res) => {
                    // Show success snackbar
                    var message = `Delete ${res.count} ${res.count > 1 ? 'objects' : 'object'} successfully.`;
                    emitter.emit('showSnackbar', 'success', message);

                    // Refresh table
                    var data = [...this.state.data];
                    data.splice(data.indexOf(oldData), 1);
                    this.setState({ ...this.state, data });
                },
                finallyCallback: () => {
                    // Resolve promise
                    resolve();

                    // Remove temp layer
                    emitter.emit('removeTempLayer');

                    // Exit edit mode
                    this.handleDoneEdit();
                }
            });
        });
    }

    componentDidMount() {
        // Initialize popover
        var anchorEl = document.getElementById('anchorEl');

        // Initialize file reader
        var reader = new FileReader();
        reader.onload = (e) => {
            // Get image info
            var image = new Image();
            image.src = e.target.result;

            // Construct preview image object
            var previewImage = {
                longitude: image.height > image.width,
                src: e.target.result
            }

            // Preview image
            this.setState({
                previewImage: previewImage
            });
        };

        this.setState({
            reader: reader,
            anchorEl: anchorEl
        });

        // Bind event listeners
        this.openSyncControllerListener = emitter.addListener('openSyncController', () => {
            this.setState({
                open: true
            });
            this.setState({
                loading:true
            })
            fetch('http://localhost:5003/run-script', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                    .then(response => response.json())
                    .then(data => {console.log(data)
                        this.setState({
                            loading:false
                        })
                        emitter.emit('showSnackbar', 'success', 'Database synchronised.')
                })
                    .catch((error) => {
                        this.setState({
                            loading:false
                        })
                        emitter.emit('showSnackbar', 'error', 'Error: Database synchronised.');
                        console.error('Error:', error);
                    });
         });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({
                open: false
            });
        });

        this.updatePointListener = emitter.addListener('setPoint', (feature, styleCode, zoom) => {
            var [lng, lat] = feature.geometry.coordinates;
            var previewMapUrl = `https://api.mapbox.com/styles/v1/${styleCode}/static/pin-s+f00(${lng},${lat})/${lng},${lat},${zoom},0,1/250x155@2x?access_token=${ACCESS_TOKEN}`;

            this.setState({
                addPointUnwrap: true,
                previewMapUrl: previewMapUrl,
                geometry: feature,
                previewCoordinate: {
                    lng: parseFloat(lng).toFixed(3),
                    lat: parseFloat(lat).toFixed(3)
                }
            });
        });
    }

    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.openDataControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.addPointListener);
        emitter.removeListener(this.updatePointListener);

        // Destory Materialbox
        var elems = document.querySelectorAll('.materialboxed');
        elems.map(elem => elem.destory());
    }

    render() {
        return (
            <ThemeProvider theme={theme}>
                <Backdrop style={styles.backdrop} open={this.state.loading}>
        <CircularProgress color="inherit" />
        <Typography variant="h6" tyle={styles.progressText}>
          Sincronizando la base da datos...
        </Typography>
      </Backdrop>
            </ThemeProvider >
        );
    }
}

export default SyncController;
