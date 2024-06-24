import * as service from '../services/apiv1usersidUserService.js';

export function findByIdUser(req, res) {
    service.findByIdUser(req, res);
}

export function updateUser(req, res) {
    service.updateUser(req, res);
}

export function deleteUser(req, res) {
    service.deleteUser(req, res);
}

