import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MainPage } from "./MainPage";

describe("MainPage", () => {
  it("작품 제목과 구역 제목을 순서대로 보여 준다", () => {
    render(<MainPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /프로젝트 제로/ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["서사", "세 개의 흐름", "기록 보관소"]);
  });

  it("서사 문장은 단어로 나눠도 한 문장으로 읽힌다", () => {
    render(<MainPage />);
    const statement = document.querySelector("#prologue p");
    if (!statement) throw new Error("서사 문장이 없습니다");
    // 기호는 보조기기에서 숨기므로, 숨기지 않은 글자만 이으면 원래 문장이 된다
    const visible = [...statement.childNodes]
      .filter((node) => !(node instanceof Element && node.getAttribute("aria-hidden") === "true"))
      .map((node) => node.textContent)
      .join("");
    expect(visible.replace(/\s+/g, " ").trim()).toBe(
      "다양한 신화관이 얽히고 우주적 규모로 확대되어 SF 전쟁까지 이어지는 대서사시.",
    );
  });

  it("아직 없는 자료는 준비 중으로 표시한다", () => {
    render(<MainPage />);
    expect(screen.getAllByText("기록 준비 중")).toHaveLength(4);
  });

  it("본문 바로가기를 제공한다", () => {
    render(<MainPage />);
    expect(screen.getByRole("link", { name: "본문 바로가기" })).toHaveAttribute(
      "href",
      "#content",
    );
    expect(
      screen.getByRole("link", { name: "디자인 시스템(Storybook)" }),
    ).toHaveAttribute("href", "/storybook/index.html");
    expect(document.getElementById("content")).toBeInTheDocument();
  });
});
