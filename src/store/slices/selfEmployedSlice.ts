import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { SelfEmployedService, SelfEmployActivity } from '../../services/selfEmployedService';

/**
 * Self employed slice state interface
 */
interface SelfEmployedState {
  data: SelfEmployActivity[] | null;
  loading: boolean;
  error: string | null;
}

const initialState: SelfEmployedState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchSelfEmployedData = createAsyncThunk(
  'selfEmployed/fetchSelfEmployedData',
  async (ssn: string, { rejectWithValue }) => {
    try {
      const response = await SelfEmployedService.getActivities(ssn);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch self employed data');
    }
  }
);

const selfEmployedSlice = createSlice({
  name: 'selfEmployed',
  initialState,
  reducers: {
    clearSelfEmployedData: (state) => {
      state.data = null;
      state.error = null;
    },
    setSelfEmployedLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSelfEmployedError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSelfEmployedData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSelfEmployedData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchSelfEmployedData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      });
  },
});

export const {
  clearSelfEmployedData,
  setSelfEmployedLoading,
  setSelfEmployedError,
} = selfEmployedSlice.actions;

export default selfEmployedSlice.reducer;
export type { SelfEmployedState };
