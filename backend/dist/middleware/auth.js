"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const errorHandler_1 = require("./errorHandler");
const requireAuth = (req, res, next) => {
    if (!req.user) {
        throw new errorHandler_1.AppError(401, 'Authentication required');
    }
    next();
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map