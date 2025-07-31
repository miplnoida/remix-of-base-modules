import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { DashboardService } from '../../services/dashboardService';

/**
 * Dashboard slice state interface
 */
interface DashboardState {
  data: any[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Initial state for the dashboard slice
 */
const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null,
};

/**
 * Async thunk for fetching dashboard data
 */
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await DashboardService.getDashboardData();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard data');
    }
  }
);

/**
 * Dashboard slice
 */
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    /**
     * Clear dashboard data
     */
    clearDashboardData: (state) => {
      state.data = null;
      state.error = null;
    },
    
    /**
     * Set loading state
     */
    setDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    /**
     * Set error message
     */
    setDashboardError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      });
  },
});

// Export actions
export const {
  clearDashboardData,
  setDashboardLoading,
  setDashboardError,
} = dashboardSlice.actions;

// Export reducer
export default dashboardSlice.reducer;

// Export types
export type { DashboardState }; 