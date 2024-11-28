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
import Canvas from '@components/canvas';
import Popup from '@components/popup';
import '@styles/materialize.min.style.css';
import RusleController from '../components/controllers/rusleController';
import SocController from '../components/controllers/socController'
import BushEncroacher from '../components/controllers/bushEncoracherController';
import SearchController from '../components/controllers/searchContoller';
import IllnessController from '../components/controllers/illnessController';
import DitwinController from '../components/controllers/diTwinController';
import DataController from '../components/controllers/dataController';
import SyncController from '../components/controllers/syncController';
import ModelController from '../components/controllers/modelController';
import ImportController from '../components/controllers/importController'

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
                    <BushEncroacher/>
                    <SearchController/>
                    <IllnessController/>
                    <DitwinController/>
                    <StyleController />
                    <LayerController />
                    <SyncController />
                    <ModelController />
                    <SocController />
                    <DataController/>
                    <ImportController/>
                    <RusleController />
                    <Popup />
                    <Canvas />
                </React.Fragment>
            </SnackbarProvider>
        );
    }
}

export default Main;
