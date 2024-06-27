/* Written by Ye Liu */

import React from 'react';
import { SnackbarProvider } from 'notistack';

import Snackbar from '@components/snackbar';
import About from '@components/about';
import Navigator from '@components/navigator';
import Menu from '@components/menu';
import Login from '@components/login';
import Feature from '@components/feature';
import StyleController from '@components/controllers/styleController';
import LayerController from '@components/controllers/layerController';
import DataController from '@components/controllers/dataController';
import ImportController from '@components/controllers/importController';
import Canvas from '@components/canvas';
import Popup from '@components/popup';
import '@styles/materialize.min.style.css';
import ModelController from '../components/controllers/modelController';
import IllnessController from '../components/controllers/illnessController';
import SyncController from '../components/controllers/syncController';
import BandController from '../components/controllers/bandController';
import SearchController from '../components/controllers/searchContoller';

class Main extends React.Component {
    render() {
        return (
            <SnackbarProvider maxSnack={3}>
                <React.Fragment>
                    <Snackbar />
                    <About />
                    <Navigator />
                    <Menu />
                    <Login />
                    <Feature />
                    <StyleController />
                    <LayerController />
                    <IllnessController/>
                    <ModelController />
                    <SearchController/>
                    <DataController />
                    <ImportController/>
                    <SyncController />
                    <BandController />
                    <Popup />
                    <Canvas />
                </React.Fragment>
            </SnackbarProvider>
        );
    }
}

export default Main;
