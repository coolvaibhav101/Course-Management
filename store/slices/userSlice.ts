// store/slices/userSlice.ts
import { removeLocalStorage, setLocalStorage } from "@/src/utils/storage";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
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
    loginUser: (state, action: PayloadAction<any>) => {
      setLocalStorage("user", action.payload);
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.organizationId = action.payload.organizationId;
      state.organizationName = action.payload.organizationName;
      state.isAuthenticated = true;
    },
    logoutUser: (state) => {
      removeLocalStorage("user");
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
