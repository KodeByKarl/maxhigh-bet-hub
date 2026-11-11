export function useAuth() {
  return {
    user: { id: "qa", username: "qa", balance: 5000 },
    setBalanceLocal() {},
    refreshJackpot() {},
    refresh() {},
  };
}
export function AuthProvider({ children }: { children: unknown }) {
  return children as never;
}
