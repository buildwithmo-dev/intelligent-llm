import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { api, ApiError, tokenStore } from "./api/client";
import { AuthProvider } from "./auth/AuthContext";

const user = { id: "u1", email: "mo@example.com", display_name: "Mo" };
const conv = { id: "c1", title: "Interview prep", created_at: "", updated_at: "" };

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("authentication flow", () => {
  it("redirects anonymous visitors to login", async () => {
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });

  it("logs in and lands on the chat start screen", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ access_token: "tok" });
    vi.spyOn(api, "me").mockResolvedValue(user);
    vi.spyOn(api, "listConversations").mockResolvedValue([]);
    renderApp("/login");

    await userEvent.type(screen.getByLabelText("Email"), "mo@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("What would you like to do?")).toBeInTheDocument();
    expect(tokenStore.get()).toBe("tok");
  });

  it("shows the server error on failed login", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new ApiError(401, "Invalid email or password"));
    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Email"), "mo@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(tokenStore.get()).toBeNull();
  });

  it("switches to sign up and sends the display name", async () => {
    const signup = vi.spyOn(api, "signup").mockResolvedValue({ access_token: "tok" });
    vi.spyOn(api, "me").mockResolvedValue(user);
    vi.spyOn(api, "listConversations").mockResolvedValue([]);
    renderApp("/login");
    await userEvent.click(screen.getByRole("button", { name: "Create an account" }));
    await userEvent.type(screen.getByLabelText(/Name/), "Mo");
    await userEvent.type(screen.getByLabelText("Email"), "mo@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(signup).toHaveBeenCalledWith("mo@example.com", "correct-horse-battery", "Mo"));
  });
});

describe("chat", () => {
  beforeEach(() => {
    tokenStore.set("tok");
    vi.spyOn(api, "me").mockResolvedValue(user);
  });

  it("restores the session and lists conversations", async () => {
    vi.spyOn(api, "listConversations").mockResolvedValue([conv]);
    renderApp("/");
    expect(await screen.findByRole("button", { name: "Interview prep" })).toBeInTheDocument();
  });

  it("creates a conversation titled from the first message and sends it", async () => {
    vi.spyOn(api, "listConversations").mockResolvedValue([]);
    const create = vi.spyOn(api, "createConversation").mockResolvedValue(conv);
    const send = vi.spyOn(api, "sendMessage").mockResolvedValue({
      id: "m1", conversation_id: "c1", role: "user", content: "Help me prepare for an interview", created_at: "",
    });
    renderApp("/");

    await userEvent.type(await screen.findByLabelText("Your request"), "Help me prepare for an interview");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(send).toHaveBeenCalledWith("c1", "Help me prepare for an interview"));
    expect(create).toHaveBeenCalledWith("Help me prepare for an interview");
    expect(await screen.findByText(/AI replies are not connected yet/)).toBeInTheDocument();
  });

  it("keeps the text and shows an error when sending fails", async () => {
    vi.spyOn(api, "listConversations").mockResolvedValue([]);
    vi.spyOn(api, "createConversation").mockRejectedValue(new ApiError(0, "Cannot reach the server."));
    renderApp("/");

    const box = await screen.findByLabelText("Your request");
    await userEvent.type(box, "hello there");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server.");
    expect(box).toHaveValue("hello there");
  });

  it("logs out", async () => {
    vi.spyOn(api, "listConversations").mockResolvedValue([]);
    renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });
});
