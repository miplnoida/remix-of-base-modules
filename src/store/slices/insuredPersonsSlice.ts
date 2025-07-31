import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { InsuredPersonsService } from '../../services/insuredPersonsService';

/**
 * Insured persons slice state interface
 */
interface InsuredPersonsState {
  data: any[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Initial state for the insured persons slice
 */
const initialState: InsuredPersonsState = {
  data: null,
  loading: false,
  error: null,
};

/**
 * Async thunk for fetching insured persons data
 */
export const fetchInsuredPersonsData = createAsyncThunk(
  'insuredPersons/fetchInsuredPersonsData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await InsuredPersonsService.getInsuredPersonsData();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch insured persons data');
    }
  }
);

/**
 * Insured persons slice
 */
const insuredPersonsSlice = createSlice({
  name: 'insuredPersons',
  initialState,
  reducers: {
    /**
     * Clear insured persons data
     */
    clearInsuredPersonsData: (state) => {
      state.data = null;
      state.error = null;
    },
    
    /**
     * Set loading state
     */
    setInsuredPersonsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    /**
     * Set error message
     */
    setInsuredPersonsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInsuredPersonsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInsuredPersonsData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchInsuredPersonsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      });
  },
});

// Export actions
export const {
  clearInsuredPersonsData,
  setInsuredPersonsLoading,
  setInsuredPersonsError,
} = insuredPersonsSlice.actions;

// Export reducer
export default insuredPersonsSlice.reducer;

// Export types
export type { InsuredPersonsState }; 