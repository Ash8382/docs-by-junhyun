import { eutcha } from "./eutcha";
import { kokoaClone } from "./kokoa-clone";
import { pfplay } from "./pfplay";
import { pickcare } from "./pickcare";
import { stock2u } from "./stock2u";
import { tix2u } from "./tix2u";
import { todoApp } from "./todo-app";
import type { Project } from "./types";
import { wally } from "./wally";

/** 끝난 날짜 순서. 진행 중인 프로젝트(PiCKCARE)는 시작 날짜로 친다(스펙 2절, 3단계). 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp, eutcha, stock2u, tix2u, pfplay, pickcare, wally];
