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
