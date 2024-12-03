import React from 'react';
import { Card, CardContent, Typography, Button, Grid } from '@mui/material';

function DataDisplay({ data, onBack }) {
    // Función para mostrar datos de los árboles
    const renderTrees = (trees) => {
        const treeEntries = Object.entries(trees).filter(([key, value]) => key !== 'recinto' && key !== 'total' && value > 0);
        if (treeEntries.length === 0) {
            return 'No existen datos de árboles disponibles.';
        }
        return treeEntries.map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join(', ');
    };

    return (
        <div>
            <Button onClick={onBack} variant="outlined" style={{ margin: '20px' }}>
                Back to Search
            </Button>
            <Card style={{ margin: '20px' }}>
                <CardContent>
                    <Typography variant="h5" component="div">
                        Información de la Parcela
                    </Typography>
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>

                    <Typography variant="subtitle1" color="textSecondary">
                        Provincia: {data.parcelaInfo.provincia || 'No existe información en SIGPAC sobre esto'}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        Municipio: {data.parcelaInfo.municipio || 'No existe información en SIGPAC sobre esto'}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        Polígono: {data.parcelaInfo.poligono}, Parcela: {data.parcelaInfo.parcela || 'No existe información en SIGPAC sobre esto'}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        Superficie: {data.parcelaInfo.dn_surface ? `${data.parcelaInfo.dn_surface.toFixed(2)} m²` : 'No existe información en SIGPAC sobre esto'}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        Referencia Catastral: {data.parcelaInfo.referencia_cat || 'No existe información en SIGPAC sobre esto'}
                    </Typography>

                    <Typography variant="h6" component="div" style={{ marginTop: '20px' }}>
                        Detalles Adicionales
                    </Typography>
                    <Grid container spacing={2}>
                        {data.query && data.query.length > 0 ? data.query.map((item, index) => (
                            <Grid item xs={12} sm={6} key={index}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="body2">
                                            Uso: {item.uso_sigpac || 'No disponible'}
                                        </Typography>
                                        <Typography variant="body2">
                                            Incidencias: {item.incidencias || 'No disponible'} - {item.inctexto ? item.inctexto.join(', ') : 'No disponible'}
                                        </Typography>
                                        <Typography variant="body2">
                                            Altitud: {item.altitud || 'No disponible'} metros
                                        </Typography>
                                        <Typography variant="body2">
                                            Pendiente Media: {item.pendiente_media || 'No disponible'}%
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )) : <Typography style={{ marginLeft: '20px' }}>No existen detalles adicionales disponibles.</Typography>}
                    </Grid>

                    <Typography variant="h6" component="div" style={{ marginTop: '20px' }}>
                                Árboles en la Parcela
                    </Typography>
                    {data.arboles && data.arboles.length > 0 ? (
                        <>

                            {data.arboles.map((arbol, index) => (
                                <Typography variant="body2" key={index}>
                                    {renderTrees(arbol)}
                                </Typography>
                            ))}
                        </>
                    ) : <Typography style={{ marginLeft: '20px' }}>No existen datos de árboles disponibles.</Typography>}

                    <Typography variant="body2" style={{ marginTop: '20px' }}>
                        Última Convergencia: {data.convergencia && data.convergencia.cat_fechaultimaconv ? new Date(data.convergencia.cat_fechaultimaconv).toLocaleDateString() : 'No disponible'}
                    </Typography>
                    <Typography variant="body2">
                        Fecha del Vuelo: {(data.vuelo && data.vuelo.fecha_vuelo) || 'No disponible'}
                    </Typography>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default DataDisplay;