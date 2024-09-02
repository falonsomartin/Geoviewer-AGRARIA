/* Written by Ye Liu */

import React from 'react';
import Slide from '@material-ui/core/Slide';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import { Typography, Icon, IconButton } from '@material-ui/core';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Box from '@mui/material/Box';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import indigo from '@material-ui/core/colors/indigo';

import emitter from '@utils/events.utils';
import request from '@utils/request.utils';
import { ACCESS_TOKEN, SERVICE } from '@/config';

import '@styles/dataController.style.css';

import HorizontalLinearStepperAOI from '../componentsJS/StepperAoi';
import HorizontalLinearStepperCS from '../componentsJS/StepperCs';

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
        zIndex: 900
    },
    value:'2',
    rooot: {
        width: '100%',
      },
    heading: {
        fontSize: theme.typography.pxToRem(15),
        flexBasis: '33.33%',
        flexShrink: 0,
      },
      secondaryHeading: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
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
    searchField: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: 40,
        padding: '2px 4px'
    },
    searchBox: {
        marginLeft: 8,
        flex: 1,
        border: 'none !important'
    },
    searchBoxBtn: {
        padding: 8
    },
    searchOptionsContainer: {
        padding: '5px 2px'
    },
    searchOption: {
        color: 'rgba(0, 0, 0, 0.6)',
        cursor: 'pointer'
    },
    searchBoxProgress: {
        marginRight: 8
    },
    searchBoxDivider: {
        width: 1,
        height: 28,
        margin: 4
    },
    resultWrapperOpen: {
        maxWidth: 800
    },
    resultWrapperClosed: {
        maxWidth: 350
    },
    resultContainer: {
        paddingTop: 0,
        paddingBottom: 0
    },
    resultTable: {
        boxShadow: 'none'
    },
    uploadBoxInput: {
        display: 'none'
    },
    uploadBoxBtnEdit: {
        width: 40,
        height: 40,
        lineHeight: '40px',
        textAlign: 'center',
        borderRadius: '50%',
        fontSize: 22
    },
    wrapBtn: {
        position: 'absolute',
        bottom: 12,
        left: 18,
        padding: 10,
        fontSize: 24
    },
    addPointWrapperOpen: {
        maxWidth: 350
    },
    addPointWrapperClose: {
        width: 0
    },
    uploadBoxBtnAdd: {
        width: 90,
        height: 90,
        lineHeight: '90px',
        textAlign: 'center',
        borderRadius: '50%',
        fontSize: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.08)'
    },
    previewImageContainer: {
        display: 'flex',
        alignItems: 'center'
    },
    nameTextField: {
        margin: '0 20px 0 13px'
    },
    pinyinTextField: {
        margin: '10px 20px 10px 13px'
    },
    introTextField: {
        width: '100%',
        marginTop: 5
    },
    locationImageContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    locationImage: {
        display: 'block',
        marginTop: 5,
        width: 225,
        height: 140,
        borderRadius: 3,
        cursor: 'pointer'
    },
    locationLabel: {
        display: 'block',
        marginTop: 6
    },
    actions: {
        paddingTop: 10
    },
    saveBtn: {
        display: 'inline-block',
        position: 'relative',
        marginRight: 10
    },
    saveBtnProgress: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
    }
};

class BandController extends React.Component {
    state = {
        open: false,
    }

    handleCloseClick = () => {
        this.setState({
            open: false
        });
    }

    handleChange = (event, newValue) => {
        this.setState({
            value:newValue
        })
    };


    handleDataSubmit = (data) => {
        console.log(data)
        if (data[0].aoiDataFiles) {
            console.log(data[0].startDate)
            const formData = new FormData();
            formData.append('startDate', data[0].startDate);
            formData.append('endDate', data[0].endDate);
            formData.append('indexType', data[0].indexType);
            formData.append('aoiDataFiles', data[0].aoiDataFiles[0]);
            console.log(formData)
            fetch('http://localhost:5004/get_image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {console.log(result.output)
              this.setState({url: result.output})
            emitter.emit('moveURL', this.state.url)     })
              .catch(error => console.error('Error:', error));
        } else if (data[1]) {
            const formData = new FormData();
            formData.append('startDate', data[0].startDate);
            formData.append('endDate', data[0].endDate);
            formData.append('indexType', data[0].indexType);
            formData.append('geojson', JSON.stringify(data[1]));
            console.log(formData)
            console.log(data[1])
            fetch('http://localhost:5004/get_image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
          .then(result => {console.log(result.output)
            this.setState({url: result.output})
          emitter.emit('moveURL', this.state.url)     })
            .catch(error => console.error('Error:', error));
        } else {
            console.error('No data to send: you must provide either a file or geoJSON data.');
        }
      //  this.setState({url: data.output})
     //   console.log("Datos recibidos en BandController:", data.output);
     //   emitter.emit('moveURL', this.state.url);
        // Puedes manejar los datos como desees aquí
      };

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

    handleSelectChange = (event) => {
        this.setState({ [event.target.name]: Number(event.target.value) });
    };


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
        this.openBandControllerListener = emitter.addListener('openBandController', () => {
            this.setState({
                open: true
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


    
        this.moveURListener = emitter.addListener('moveURL', () => {
            this.moveURL();
        });
    }

    
    

    moveURL = () => {
        var url = this.state.url
        this.setState({ movedURL: url });
        console.log(this.state.movedURL)

    }
    

    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.openBandControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.addPointListener);
        emitter.removeListener(this.updatePointListener);
        emitter.removeListener(this.moveURListener);

        var elems = document.querySelectorAll('.materialboxed');
        elems.map(elem => elem.destory());
    }

    render() {        
        return (
            <ThemeProvider theme={theme}>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        {/* Card header */}
                        <CardContent style={styles.header}>
                        <Typography variant="h5" className={styles.title}>Spectral Indexes Mapping</Typography>
                        &nbsp;&nbsp;
                        <TabContext value={this.state.value}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={this.handleChange} aria-label="lab API tabs example">
            <Tab label="Upload your AOI" value="1" />
            <Tab label="Search by Cadstrl Ref" value="2" />
          </TabList>
        </Box>
        <TabPanel value="1">
        <HorizontalLinearStepperAOI onSubmit={this.handleDataSubmit}/>
            
        </TabPanel>
        <TabPanel value="2">
        <HorizontalLinearStepperCS onSubmit={this.handleDataSubmit}/>

        </TabPanel>
      </TabContext>

            <IconButton style={styles.closeBtn} aria-label="Close" onClick={this.handleCloseClick}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>
                    </Card>
                </Slide>
            </ThemeProvider >
        );
    }
}

export default BandController;