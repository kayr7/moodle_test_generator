import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/questions/new",
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// We need to import after mocks
import { QuestionForm } from "@/components/questions/question-form";

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/categories") {
      return Promise.resolve({
        json: () => Promise.resolve([{ id: 1, name: "Math" }]),
      });
    }
    if (url.startsWith("/api/questions") && !url.includes("/new")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

describe("QuestionForm", () => {
  it("should render with default multichoice type", async () => {
    render(<QuestionForm />);

    await waitFor(() => {
      expect(screen.getByText("New Question")).toBeInTheDocument();
    });

    // Check that question type buttons exist
    expect(screen.getByText("Multiple Choice")).toBeInTheDocument();
    expect(screen.getByText("True/False")).toBeInTheDocument();
    expect(screen.getByText("Short Answer")).toBeInTheDocument();
    expect(screen.getByText("Matching")).toBeInTheDocument();
    expect(screen.getByText("Numerical")).toBeInTheDocument();
    expect(screen.getByText("Essay")).toBeInTheDocument();
  });

  it("should show answer options section for multichoice", async () => {
    render(<QuestionForm />);

    await waitFor(() => {
      expect(screen.getByText("Answer Options")).toBeInTheDocument();
    });
  });

  it("should switch to True/False view when TF selected", async () => {
    const user = userEvent.setup();
    render(<QuestionForm />);

    await waitFor(() => {
      expect(screen.getByText("True/False")).toBeInTheDocument();
    });

    // Click True/False type button
    const tfButton = screen.getAllByText("True/False")[0];
    await user.click(tfButton);

    await waitFor(() => {
      expect(screen.getByText("Correct Answer")).toBeInTheDocument();
    });
  });

  it("should switch to Essay view with no answer fields", async () => {
    const user = userEvent.setup();
    render(<QuestionForm />);

    await waitFor(() => {
      expect(screen.getByText("Essay")).toBeInTheDocument();
    });

    const essayButton = screen.getAllByText("Essay")[0];
    await user.click(essayButton);

    await waitFor(() => {
      expect(screen.getByText(/essay questions have no predefined answers/i)).toBeInTheDocument();
    });
  });

  it("should switch to Matching view with pairs", async () => {
    const user = userEvent.setup();
    render(<QuestionForm />);

    await waitFor(() => {
      expect(screen.getByText("Matching")).toBeInTheDocument();
    });

    const matchButton = screen.getAllByText("Matching")[0];
    await user.click(matchButton);

    await waitFor(() => {
      expect(screen.getByText("Matching Pairs")).toBeInTheDocument();
    });
  });

  it("should switch to Numerical view", async () => {
    const user = userEvent.setup();
    render(<QuestionForm />);

    await waitFor(() => {
      expect(screen.getByText("Numerical")).toBeInTheDocument();
    });

    const numButton = screen.getAllByText("Numerical")[0];
    await user.click(numButton);

    await waitFor(() => {
      expect(screen.getByText("Numerical Answer")).toBeInTheDocument();
    });
  });

  it("should show edit title when questionId is provided", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/categories") {
        return Promise.resolve({
          json: () => Promise.resolve([]),
        });
      }
      if (url === "/api/questions/1") {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              id: 1,
              type: "multichoice",
              name: "Test Q",
              questionText: "Test text",
              generalFeedback: "",
              categoryId: null,
              singleAnswer: true,
              answers: [
                { answerText: "A", fraction: 100, feedback: "", sortOrder: 0 },
              ],
              matchingPairs: [],
              numericalOptions: [],
              images: [],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<QuestionForm questionId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Question")).toBeInTheDocument();
    });
  });

  it("should have required question text field", async () => {
    render(<QuestionForm />);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText("Enter the question text (HTML supported)");
      expect(textarea).toBeRequired();
    });
  });
});
