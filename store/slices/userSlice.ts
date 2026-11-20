// store/slices/userSlice.ts
import { LOCAL_STORAGE_KEYS } from "@/src/constants/localStorageKeys";
import { normalizeRole, RoleKey } from "@/src/constants/roleKeys";
import { User } from "@/types/user";
import { removeLocalStorage, setLocalStorage } from "@/src/utils/storage";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserState {
  id: string | null;
  name: string | null;
  email: string | null;
  role: RoleKey | null;
  organizationId?: string;
  organizationName?: string;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  id: null,
  name: null,
  email: null,
  role: null,
  organizationId: undefined,
  organizationName: undefined,
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginUser: (
      state,
      action: PayloadAction<User | Record<string, unknown>>,
    ) => {
      const payload = (action.payload || {}) as Record<string, unknown>;
      const normalizedUser = {
        ...payload,
        role: normalizeRole(payload.role as string | undefined),
      };
      setLocalStorage(LOCAL_STORAGE_KEYS.USER_INFO, normalizedUser);
      state.id = String(payload.id ?? "");
      state.name = String(payload.name ?? "");
      state.email = String(payload.email ?? "");
      state.role = normalizedUser.role;
      state.organizationId =
        payload.organizationId === undefined
          ? undefined
          : String(payload.organizationId);
      state.organizationName =
        payload.organizationName === undefined
          ? undefined
          : String(payload.organizationName);
      state.isAuthenticated = true;
    },
    logoutUser: (state) => {
      removeLocalStorage(LOCAL_STORAGE_KEYS.USER_INFO);
      // Reset to initial state
      state.id = null;
      state.name = null;
      state.email = null;
      state.role = null;
      state.organizationId = undefined;
      state.organizationName = undefined;
      state.isAuthenticated = false;
    },
    updateUser: (state, action: PayloadAction<Partial<UserState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { loginUser, logoutUser, updateUser } = userSlice.actions;
export default userSlice.reducer;
