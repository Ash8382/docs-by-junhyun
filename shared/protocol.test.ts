import { describe, expect, it } from "vitest";
import { parseClientMessage } from "@shared/protocol";

describe("parseClientMessage", () => {
  it("정상 메시지를 통과시킨다", () => {
    expect(parseClientMessage('{"t":"hello","nick":"밤톨"}')).toEqual({
      t: "hello",
      nick: "밤톨",
    });
    expect(parseClientMessage('{"t":"input","seq":3,"dir":"e"}')).toEqual({
      t: "input",
      seq: 3,
      dir: "e",
    });
    expect(parseClientMessage('{"t":"input","seq":3,"dir":null}')).toEqual({
      t: "input",
      seq: 3,
      dir: null,
    });
    expect(parseClientMessage('{"t":"click","seq":1,"x":10,"y":20}')).toEqual({
      t: "click",
      seq: 1,
      x: 10,
      y: 20,
    });
    expect(parseClientMessage('{"t":"say","text":"안녕"}')).toEqual({
      t: "say",
      text: "안녕",
    });
    expect(parseClientMessage('{"t":"interact","objectId":"radio"}')).toEqual({
      t: "interact",
      objectId: "radio",
    });
  });

  it("세션 토큰이 있으면 함께 넘긴다", () => {
    expect(parseClientMessage('{"t":"hello","nick":"밤톨","sessionToken":"abc"}')).toEqual({
      t: "hello",
      nick: "밤톨",
      sessionToken: "abc",
    });
  });

  it("JSON이 아니면 null이다", () => {
    expect(parseClientMessage("not json")).toBeNull();
    expect(parseClientMessage("")).toBeNull();
  });

  it("모르는 타입은 null이다", () => {
    expect(parseClientMessage('{"t":"launch_missile"}')).toBeNull();
    expect(parseClientMessage('{"nick":"밤톨"}')).toBeNull();
    expect(parseClientMessage('"just a string"')).toBeNull();
    expect(parseClientMessage("null")).toBeNull();
  });

  it("필드 타입이 틀리면 null이다", () => {
    expect(parseClientMessage('{"t":"input","seq":"3","dir":"e"}')).toBeNull();
    expect(parseClientMessage('{"t":"input","seq":3,"dir":"up"}')).toBeNull();
    expect(parseClientMessage('{"t":"hello","nick":123}')).toBeNull();
    expect(parseClientMessage('{"t":"click","seq":1,"x":"10","y":20}')).toBeNull();
    expect(parseClientMessage('{"t":"click","seq":1,"x":null,"y":20}')).toBeNull();
  });

  it("좌표가 유한수가 아니면 null이다", () => {
    expect(parseClientMessage('{"t":"click","seq":1,"x":1e999,"y":0}')).toBeNull();
  });
});
