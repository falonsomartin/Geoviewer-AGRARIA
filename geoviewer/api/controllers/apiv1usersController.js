import * as service from '../services/apiv1usersService.js';

export function getUsers(req, res) {
    service.getUsers(req, res);
}

export function addUser(req, res) {
    service.addUser(req, res);
}

