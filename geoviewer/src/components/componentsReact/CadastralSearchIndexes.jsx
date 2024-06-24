import React, { useState } from 'react';
import { TextField, Card, CardContent } from '@mui/material';
import DataDisplay from '../componentsJS/DataDisplay';

function CadastralSearchIndexes({ onSubmit }) {

    return (
        <div>
        {!showResults ? (
            <Card style={{ maxWidth: 500, margin: '20px auto' }}>
                <CardContent>
                    <TextField
                        fullWidth
                        label="Ref. Catastral"
                        variant="outlined"
                        value={cadastralRef}
                        onChange={e => setCadastralRef(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />

                        <TextField
                            fullWidth
                            label="Número del Recinto"
                            variant="outlined"
                            value={recintoNum}
                            onChange={e => setRecintoNum(e.target.value)}
                            style={{ marginBottom: 16 }}
                        />
                    
                </CardContent>
            </Card>
        ) : (
            <DataDisplay data={result} onBack={handleBack} />
        )}
    </div>

    );
}

export default CadastralSearchIndexes;