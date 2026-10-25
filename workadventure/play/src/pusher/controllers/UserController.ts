import { z } from "zod";
import { isAxiosError } from "axios";
import type { Request, Response } from "express";
import Debug from "debug";
import { adminService } from "../services/AdminService";
import { validatePostQuery } from "../services/QueryValidator";
import type { ResponseWithUserIdentifier } from "../middlewares/Authenticated";
import { authenticated } from "../middlewares/Authenticated";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

export class UserController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes(): void {
        this.saveName();
        this.saveTextures();
        this.saveCompanionTexture();
        this.renameRoom();
    }

    /**
     * @openapi
     * /save-name:
     *   post:
     *     description: Saves the name of the user in the (admin) database, if any.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: "object"
     *             properties:
     *               roomUrl:
     *                 type: string
     *                 required: true
     *                 description: The URL of the room
     *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
     *               name:
     *                 type: string
     *                 required: true
     *                 description: The new name for the Woka
     *                 example: "Alice"
     *               userIdentifier:
     *                 type: string
     *                 required: true
     *                 description: "It can be an uuid or an email"
     *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
     *     responses:
     *      204:
     *         description: Save succeeded
     *       404:
     *         description: User or room not found
     *         schema:
     *             $ref: '#/definitions/ErrorApiErrorData'
     */
    private saveName(): void {
        this.app.options("/save-name", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.post("/save-name", [authenticated], async (req: Request, res: ResponseWithUserIdentifier) => {
            debug(`UserController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const body = validatePostQuery(
                req,
                res,
                z.object({
                    name: z.string(),
                    roomUrl: z.string(),
                }),
            );

            if (body === undefined) {
                return;
            }

            if (!res.userIdentifier) {
                res.status(401).send("Undefined userIdentifier");
                return;
            }

            // Not logged? Nothing to save!
            if (res.isLogged) {
                await adminService.saveName(res.userIdentifier, body.name, body.roomUrl);
            }

            res.status(204).send("");
            return;
        });
    }

    /**
     * @openapi
     * /save-textures:
     *   post:
     *     description: Saves the selected textures of the Woka in admin database, if any.
     *    requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: "object"
     *             properties:
     *               roomUrl:
     *                 type: string
     *                 required: true
     *                 description: The URL of the room
     *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
     *               textures:
     *                 type: array
     *                 items:
     *                   type: string
     *                 required: true
     *                 description: The textures of the Woka
     *                 example: ["ab7ce839-3dea-4698-8b41-ebbdf7688ad9"]
     *               userIdentifier:
     *                 type: string
     *                 required: true
     *                 description: "It can be an uuid or an email"
     *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
     *     responses:
     *      204:
     *         description: Save succeeded
     *       404:
     *         description: User or room not found
     *         schema:
     *             $ref: '#/definitions/ErrorApiErrorData'
     */
    private saveTextures(): void {
        this.app.options("/save-textures", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.post("/save-textures", [authenticated], async (req: Request, res: ResponseWithUserIdentifier) => {
            debug(`UserController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const body = validatePostQuery(
                req,
                res,
                z.object({
                    textures: z.array(z.string()),
                    roomUrl: z.string(),
                }),
            );

            if (body === undefined) {
                return;
            }

            if (!res.userIdentifier) {
                res.status(401).send("Undefined userIdentifier");
                return;
            }

            // Not logged? Nothing to save!
            if (res.isLogged) {
                await adminService.saveTextures(res.userIdentifier, body.textures, body.roomUrl);
            }

            res.status(204).send("");
            return;
        });
    }

    /**
     * @openapi
     * /save-companion-texture:
     *   post:
     *     description: Saves the selected texture of the companion in admin database, if any.
     *    requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: "object"
     *             properties:
     *               roomUrl:
     *                 type: string
     *                 required: true
     *                 description: The URL of the room
     *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
     *               texture:
     *                 type: string
     *                 required: true
     *                 description: The textures of the companion
     *                 example: "ab7ce839-3dea-4698-8b41-ebbdf7688ad9"
     *               userIdentifier:
     *                 type: string
     *                 required: true
     *                 description: "It can be an uuid or an email"
     *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
     *     responses:
     *      204:
     *         description: Save succeeded
     *       404:
     *         description: User or room not found
     *         schema:
     *             $ref: '#/definitions/ErrorApiErrorData'
     */
    private saveCompanionTexture(): void {
        this.app.options("/save-companion-texture", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.post(
            "/save-companion-texture",
            [authenticated],
            async (req: Request, res: ResponseWithUserIdentifier) => {
                debug(`UserController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
                const body = validatePostQuery(
                    req,
                    res,
                    z.object({
                        texture: z.string().nullable(),
                        roomUrl: z.string(),
                    }),
                );

                if (body === undefined) {
                    return;
                }

                if (!res.userIdentifier) {
                    res.status(401).send("Undefined userIdentifier");
                    return;
                }

                // Not logged? Nothing to save!
                if (res.isLogged) {
                    await adminService.saveCompanionTexture(res.userIdentifier, body.texture, body.roomUrl);
                }

                res.status(204).send("");
                return;
            },
        );
    }

    /**
     * @openapi
     * /room/rename:
     *   post:
     *     description: Renames a room of the world, for an administrator of the world (checked by the admin).
     *     responses:
     *       204:
     *         description: Renamed
     *       403:
     *         description: The person may not rename rooms
     */
    private renameRoom(): void {
        this.app.options("/room/rename", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.post("/room/rename", [authenticated], async (req: Request, res: ResponseWithUserIdentifier) => {
            debug(`UserController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const body = validatePostQuery(
                req,
                res,
                z.object({
                    roomUrl: z.string(),
                    name: z.string().trim().min(1).max(200),
                }),
            );
            if (body === undefined) {
                return;
            }
            // Only a person signed in through the back office has an account whose rights can be checked.
            if (!res.userIdentifier || !res.isBackoffice) {
                res.status(403).send("Not allowed");
                return;
            }
            try {
                await adminService.renameRoom(body.roomUrl, res.userIdentifier, body.name);
            } catch (err) {
                const status = isAxiosError(err) ? err.response?.status : undefined;
                res.status(status === 403 || status === 404 ? status : 500).send("Could not rename the room");
                return;
            }
            res.status(204).send("");
            return;
        });
    }
}
