import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { SelfEmployedService } from '../../services/selfEmployedService';

/**
 * Self employed slice state interface
 */
interface SelfEmployedState {
  data: any[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Initial state for the self employed slice
 */
const initialState: SelfEmployedState = {
  data: null,
  loading: false,
  error: null,
};

/**
 * Async thunk for fetching self employed data
 */
export const fetchSelfEmployedData = createAsyncThunk(
  'selfEmployed/fetchSelfEmployedData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await SelfEmployedService.getSelfEmployedData();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch self employed data');
    }
  }
);

/**
 * Self employed slice
 */
const selfEmployedSlice = createSlice({
  name: 'selfEmployed',
  initialState,
  reducers: {
    /**
     * Clear self employed data
     */
    clearSelfEmployedData: (state) => {
      state.data = null;
      state.error = null;
    },
    
    /**
     * Set loading state
     */
    setSelfEmployedLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    /**
     * Set error message
     */
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

// Export actions
export const {
  clearSelfEmployedData,
  setSelfEmployedLoading,
  setSelfEmployedError,
} = selfEmployedSlice.actions;

// Export reducer
export default selfEmployedSlice.reducer;

// Export types
export type { SelfEmployedState }; 