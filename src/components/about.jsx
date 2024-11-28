/* Written by Ye Liu */

import React from 'react';
import M from 'materialize-css';

const styles = {
    root: {
        position: 'fixed',
        top: 0,
        zIndex: 900
    },
    logoContainer: {
        height: '60px'
    },
    logo: {
        height: '55px',
    },
    flexContainer: {
        position: 'absolute',
        right: 12,
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start'
    },
    svgIcon: {
        width: 24,
        height: 24
    },
    fontIcon: {
        fontSize: 29
    },
    toolbar:{
        background: '#89ca92'
    }
};

class About extends React.Component {
    state = {
        modal: null
    }

    componentDidMount() {
        // Initialize Modal
        document.addEventListener('DOMContentLoaded', () => {
            var elem = document.getElementById('about');
            var modal = M.Modal.init(elem);
            this.setState({
                modal: modal
            });
        });
    }

    componentWillUnmount() {
        // Destory Modal
        this.state.modal.destory();
    }

    render() {
        return (
            <div id="about" className="modal">
                <div className="modal-content">
                    <h4>About</h4>
                    <p>
                    Designed & Written by&nbsp;
                    <a href="https://evenor-tech.com/">Evenor-Tech</a>.
                    </p>
                    <p>
                        <a style={styles.logoContainer} href="https://www.steambioafrica.com/">
                        <img style={styles.logo} src="./static/assets/eu.png" alt="" />
                        </a>
                    </p>
                    
                </div>
                <div className="modal-footer">
                    <button className="modal-close waves-effect waves-light btn-flat">OK</button>
                </div>
            </div>
        );
    }
}

export default About;
