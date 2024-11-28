import React, { useState } from 'react';
import { TextField, Button, Grid, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Typography } from '@mui/material';
import CountrySelect from './CountrySelect';  // Importar el selector de país

const RequestForm = ({ onSubmit }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [organisation, setOrganisation] = useState('');
    const [typeOfOrganisation, setTypeOfOrganisation] = useState('');
    const [country, setCountry] = useState('');
    const [showOtherField, setShowOtherField] = useState(false);  // Estado para controlar si se muestra el TextField
    const [otherOrganisation, setOtherOrganisation] = useState('');  // Estado para almacenar el valor de "Other"

    // Estilos en línea para el overlay y el modal
    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.5)', // Fondo ensombrecido
        zIndex: 1000, // Para asegurar que esté por encima de todo
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    };

    const handleTypeChange = (event) => {
        const value = event.target.value;
        setTypeOfOrganisation(value);

        if (value === 'Other') {
            setShowOtherField(true);
        } else {
            setShowOtherField(false);
            setOtherOrganisation('');  // Reseteamos el valor de "Other" si se elige otra opción
        }
    };

    const modalFormStyle = {
        background: 'white',
        padding: '0px 0px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1100, // Para asegurar que esté por encima del overlay
        width: '450px', // Ajustamos el tamaño del modal
    };

    const headerStyle = {
        backgroundColor: '#6fbf73',  // Color verde
        color: 'white',
        padding: '15px 0',  // Aumentamos el padding superior e inferior
        textAlign: 'center',
        width: '100%',  // Ocupa todo el ancho del modal
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
    };

    const handleSubmit = async () => {
	const data = {
		email: email,
		name: name,
		organisation: organisation,
		type_of_organisation: showOtherField ? otherOrganisation : typeOfOrganisation,
		country: country
	};

	try {
		const response = await fetch('https://terrenviron.evenor-tech.com/api/register_user', {
		    method: 'POST',
		    headers: {
			'Content-Type': 'application/json',
		    },
		    body: JSON.stringify(data)
	});

	const result = await response.json();
	if (result.success) {
	    onSubmit(true);
	    console.log("User registered successfully");
	} else {
	    onSubmit(false);
	    console.error(result.error);
	}
	   } catch (error) {
	onSubmit(false);
	console.error('Error:', error);
	    }
    };


    return (
        <div style={overlayStyle}>
            <div style={{ ...modalFormStyle, paddingTop: 0 }}> {/* Removemos el padding superior */}
                {/* Cabecera con título */}
                <div style={headerStyle}>
                    <Typography variant="h6">Access Form</Typography>
                    <Typography variant="subtitle2">Please, fill the form to continue</Typography>
                </div>

                <form style={{ padding: '0px 20px 0px 20px' }}> {/* Ajustamos el padding del formulario */}
                    <Grid container spacing={2} style={{ marginTop: '10px' }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email"
                                variant="outlined"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="First and Last Name"
                                variant="outlined"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Organisation"
                                variant="outlined"
                                value={organisation}
                                onChange={(e) => setOrganisation(e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl component="fieldset" fullWidth>
                                <FormLabel component="legend" style={{ marginBottom: '8px' }}>Type of Organisation</FormLabel>
                                <RadioGroup
                            value={typeOfOrganisation}
                            onChange={handleTypeChange}
                            row
                        >
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <FormControlLabel value="Private Company" control={<Radio />} label="Private Company" />
                                        <FormControlLabel value="Research Organization" control={<Radio />} label="Research Organization" />
                                        <FormControlLabel value="University" control={<Radio />} label="University" />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <FormControlLabel value="Public Administration" control={<Radio />} label="Public Administration" />
                                        <FormControlLabel value="Other" control={<Radio />} label="Other (specify)" />
                                    </Grid>
                                </Grid>
                                </RadioGroup>
                                {showOtherField && (
                                    <TextField
                                        fullWidth
                                        label="Specify other type of organisation"
                                        variant="outlined"
                                        value={otherOrganisation}
                                        onChange={(e) => setOtherOrganisation(e.target.value)}
                                        required
                                        style={{ marginTop: '10px' }}
                                    />
                                )}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <CountrySelect onCountryChange={(code) => setCountry(code)} /> {/* Usar el nuevo CountrySelect */}
                            </FormControl>
                        </Grid>
                    </Grid>
                    <Button variant="contained" color="success" onClick={handleSubmit} style={{ marginTop: 20 }}>
                        Submit
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default RequestForm;
