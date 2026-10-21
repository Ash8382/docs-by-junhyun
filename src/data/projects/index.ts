import { eutcha } from "./eutcha";
import { kokoaClone } from "./kokoa-clone";
import { pfplay } from "./pfplay";
import { pickcare } from "./pickcare";
import { stock2u } from "./stock2u";
import { tix2u } from "./tix2u";
import { todoApp } from "./todo-app";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp, eutcha, stock2u, tix2u, pfplay, pickcare];
