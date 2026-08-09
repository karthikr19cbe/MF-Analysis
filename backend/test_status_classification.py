"""Unit tests for stock status classification logic."""

import pytest
from generate_multi_period import _classify_status, MV_HOLD_THRESHOLD


def _holding(mv, pct, qty=0):
    """Helper to create a holding dict."""
    return {"market_value_lakhs": mv, "pct_of_net_assets": pct, "quantity": qty}


class TestClassifyStatus:
    """Tests for _classify_status using relative market value change."""

    def test_hold_when_market_value_barely_changes(self):
        """Indian Bank case: MV 803.35 -> 802.91 (-0.05%), should be Hold."""
        prev = _holding(803.35, 2.16, 81105)
        curr = _holding(802.91, 2.15, 94940)
        assert _classify_status(prev, curr) == "Hold"

    def test_inc_when_market_value_grows_but_pct_same(self):
        """Liquid Fund case: MV 1511.05 -> 1518.85 (+0.52%), should be Inc."""
        prev = _holding(1511.05, 4.07, 148636)
        curr = _holding(1518.85, 4.07, 148636)
        assert _classify_status(prev, curr) == "Inc"

    def test_dec_when_market_value_drops_significantly(self):
        """Clear decrease: MV drops > 0.5%."""
        prev = _holding(492.80, 1.86, 49753)
        curr = _holding(420.76, 1.80, 49753)
        assert _classify_status(prev, curr) == "Dec"

    def test_inc_when_market_value_grows_significantly(self):
        """Clear increase: MV grows > 0.5%."""
        prev = _holding(1000.0, 5.0)
        curr = _holding(1100.0, 5.5)
        assert _classify_status(prev, curr) == "Inc"

    def test_hold_at_exact_threshold_boundary(self):
        """At exactly 0.5% change, should be Hold (< not <=)."""
        prev = _holding(1000.0, 5.0)
        # 0.5% of 1000 = 5.0, so curr = 1004.99 is just under threshold
        curr = _holding(1004.99, 5.0)
        assert _classify_status(prev, curr) == "Hold"

    def test_inc_just_above_threshold(self):
        """Just above 0.5% should be Inc."""
        prev = _holding(1000.0, 5.0)
        curr = _holding(1005.01, 5.0)
        assert _classify_status(prev, curr) == "Inc"

    def test_dec_just_above_threshold_negative(self):
        """Just above 0.5% drop should be Dec."""
        prev = _holding(1000.0, 5.0)
        curr = _holding(994.99, 5.0)
        assert _classify_status(prev, curr) == "Dec"

    def test_hold_when_both_unchanged(self):
        """Identical values should be Hold."""
        prev = _holding(500.0, 3.0, 10000)
        curr = _holding(500.0, 3.0, 10000)
        assert _classify_status(prev, curr) == "Hold"

    def test_inc_from_zero_prev(self):
        """Previous MV is 0 but current is positive -> Inc."""
        prev = _holding(0.0, 0.0)
        curr = _holding(100.0, 1.0)
        assert _classify_status(prev, curr) == "Inc"

    def test_hold_both_zero(self):
        """Both zero should be Hold."""
        prev = _holding(0.0, 0.0)
        curr = _holding(0.0, 0.0)
        assert _classify_status(prev, curr) == "Hold"

    def test_pct_change_doesnt_affect_status(self):
        """
        Even if pct changes a lot (due to AUM shift), status should
        follow market value, not percentage.
        """
        # MV barely changed but pct dropped from 5% to 3% (AUM grew)
        prev = _holding(500.0, 5.0, 10000)
        curr = _holding(501.0, 3.0, 10000)
        assert _classify_status(prev, curr) == "Hold"

    def test_small_holding_inc(self):
        """Small holding: 10L -> 10.10L (+1%) should be Inc."""
        prev = _holding(10.0, 0.1)
        curr = _holding(10.10, 0.1)
        assert _classify_status(prev, curr) == "Inc"

    def test_small_holding_hold(self):
        """Small holding: 10L -> 10.04L (+0.4%) should be Hold."""
        prev = _holding(10.0, 0.1)
        curr = _holding(10.04, 0.1)
        assert _classify_status(prev, curr) == "Hold"

    def test_large_holding_dec(self):
        """Large holding with small absolute but > 0.5% relative drop."""
        prev = _holding(50000.0, 20.0)
        curr = _holding(49700.0, 19.8)  # -0.6%
        assert _classify_status(prev, curr) == "Dec"

    def test_negative_market_value_dec(self):
        """Derivative going negative from positive -> Dec."""
        prev = _holding(100.0, 0.5)
        curr = _holding(-50.0, -0.25)
        assert _classify_status(prev, curr) == "Dec"


class TestThresholdValue:
    """Verify the threshold constant is reasonable."""

    def test_threshold_is_half_percent(self):
        assert MV_HOLD_THRESHOLD == 0.005
