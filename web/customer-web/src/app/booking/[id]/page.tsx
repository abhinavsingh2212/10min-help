'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Star,
  CreditCard,
  Banknote,
  Wrench,
  XCircle,
  Share2,
  FileText,
} from 'lucide-react';
import {
  bookingsApi,
  paymentsApi,
  reviewsApi,
  getStoredToken,
} from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { BookingStatus, PaymentStatus, SOCKET_EVENTS } from '@10min-help/shared';

export default function BookingDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quote revision modal state
  const [respondingToQuote, setRespondingToQuote] = useState(false);

  // Payment modal state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Review modal state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Cancellation state
  const [cancelling, setCancelling] = useState(false);

  // Fetch initial booking
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push(`/login?redirect=/booking/${id}`);
      return;
    }

    async function fetchBooking() {
      try {
        setLoading(true);
        const res = await bookingsApi.getById(id);
        setBooking(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [id, router]);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();

    // Join room for this booking
    socket.emit('join:booking', { bookingId: id });

    // Listen for status updates
    socket.on(SOCKET_EVENTS.BOOKING_STATUS, (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) => (prev ? { ...prev, status: data.status } : prev));
      }
    });

    // Listen for technician assignment
    socket.on(SOCKET_EVENTS.BOOKING_ASSIGNED, (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) =>
          prev
            ? {
                ...prev,
                status: BookingStatus.ASSIGNED,
                technician: data.technician,
                estimatedEtaMinutes: data.technician?.estimatedEtaMinutes || 10,
              }
            : prev
        );
      }
    });

    // Listen for quote updates
    socket.on(SOCKET_EVENTS.BOOKING_QUOTE_UPDATED, (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) =>
          prev
            ? {
                ...prev,
                status: BookingStatus.AWAITING_CUSTOMER_APPROVAL,
                quotedPrice: data.revisedAmount,
                quoteRevisionReason: data.reason,
              }
            : prev
        );
      }
    });

    // Listen for live technician tracking
    socket.on(SOCKET_EVENTS.TRACKING_LOCATION, (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) =>
          prev
            ? {
                ...prev,
                technicianLocation: data.location,
                estimatedEtaMinutes: data.estimatedEtaMinutes,
              }
            : prev
        );
      }
    });

    // Listen for payment updates
    socket.on(SOCKET_EVENTS.PAYMENT_UPDATED, (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) =>
          prev ? { ...prev, paymentStatus: data.paymentStatus } : prev
        );
        setPaymentSuccess(true);
      }
    });

    return () => {
      socket.emit('leave:booking', { bookingId: id });
      socket.off(SOCKET_EVENTS.BOOKING_STATUS);
      socket.off(SOCKET_EVENTS.BOOKING_ASSIGNED);
      socket.off(SOCKET_EVENTS.BOOKING_QUOTE_UPDATED);
      socket.off(SOCKET_EVENTS.TRACKING_LOCATION);
      socket.off(SOCKET_EVENTS.PAYMENT_UPDATED);
    };
  }, [id]);

  // Handle quote approval/rejection
  const handleQuoteResponse = async (approved: boolean) => {
    try {
      setRespondingToQuote(true);
      const res = await bookingsApi.respondQuote(id, approved);
      setBooking(res.data);
    } catch (err: any) {
      alert(`Error responding to quote: ${err.message}`);
    } finally {
      setRespondingToQuote(false);
    }
  };

  // Handle payment
  const handlePayNow = async (method: 'UPI' | 'CARD') => {
    try {
      setPaymentLoading(true);
      const orderRes = await paymentsApi.createOrder(id, method);
      const { orderId } = orderRes.data;

      // In production Razorpay checkout opens here; in mock sandbox we verify directly
      const verifyRes = await paymentsApi.verify({
        bookingId: id,
        providerOrderId: orderId,
        providerPaymentId: `mock_pay_${Date.now()}`,
        signature: 'valid_mock_signature',
      });

      setPaymentSuccess(true);
      setBooking((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.PAID }));
    } catch (err: any) {
      alert(`Payment error: ${err.message}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reviewsApi.create(id, rating, comment);
      setReviewSubmitted(true);
    } catch (err: any) {
      alert(`Review error: ${err.message}`);
    }
  };

  // Handle cancellation
  const handleCancelBooking = async () => {
    const reason = prompt('Please enter a cancellation reason:');
    if (!reason) return;
    try {
      setCancelling(true);
      const res = await bookingsApi.cancel(id, reason);
      setBooking(res.data);
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-600">Connecting to live dispatch stream...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-gray-100 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Booking Not Found</h2>
        <p className="text-xs text-gray-500">{error || 'Unable to retrieve booking details.'}</p>
        <button
          onClick={() => router.push('/book')}
          className="bg-brand-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm"
        >
          Book New Assistance
        </button>
      </div>
    );
  }

  const isSearching = booking.status === BookingStatus.REQUESTED || booking.status === BookingStatus.SEARCHING;
  const isAssigned = booking.status === BookingStatus.ASSIGNED || booking.status === BookingStatus.EN_ROUTE;
  const isArrived = booking.status === BookingStatus.ARRIVED || booking.status === BookingStatus.INSPECTING;
  const isAwaitingQuote = booking.status === BookingStatus.AWAITING_CUSTOMER_APPROVAL;
  const isInProgress = booking.status === BookingStatus.IN_PROGRESS;
  const isCompleted = booking.status === BookingStatus.COMPLETED;
  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isUnfulfilled = booking.status === BookingStatus.UNFULFILLED;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Booking Ref #{booking._id.substring(booking._id.length - 8).toUpperCase()}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
              {booking.vehicle?.vehicleType}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {booking.service?.name || 'Roadside Assistance'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {booking.vehicle?.manufacturer} {booking.vehicle?.model} • {booking.vehicle?.registrationNumber || 'No plate'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: '10Min Help Assistance Tracking',
                  text: `Tracking live roadside assistance for my vehicle.`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Live tracking link copied to clipboard!');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-brand-600" />
            <span>Share Tracking</span>
          </button>

          {!isCompleted && !isCancelled && (
            <button
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* STATE 1: SEARCHING RADAR */}
      {isSearching && (
        <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-10 border border-amber-200 text-center space-y-6 shadow-sm">
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-brand-400 animate-radar" />
            <div className="w-16 h-16 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center font-black shadow-md z-10">
              <Wrench className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Contacting Nearby Mechanics
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              We are pinging the highest-ranked verified technicians in your service radius with a 15-second timed offer window.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-100/80 px-4 py-2 rounded-full border border-amber-300">
            <Clock className="w-4 h-4 text-amber-700 animate-spin" />
            <span>Target response window active</span>
          </div>
        </div>
      )}

      {/* STATE: UNFULFILLED */}
      {isUnfulfilled && (
        <div className="bg-red-50 rounded-3xl p-8 border border-red-200 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-xl font-black text-red-900">
            No Technicians Available Currently
          </h2>
          <p className="text-xs text-red-700 max-w-md mx-auto">
            All nearby verified mechanics are occupied with active repairs in this zone. Please call our 24x7 emergency helpline for manual dispatch.
          </p>
          <a
            href="tel:1800101010"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md"
          >
            <Phone className="w-4 h-4" />
            <span>Call 24/7 Helpline: 1800-101010</span>
          </a>
        </div>
      )}

      {/* STATE 2: ASSIGNED / EN ROUTE */}
      {(isAssigned || isArrived || isInProgress || isCompleted) && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Technician Profile & ETA */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              
              {/* ETA Badge */}
              <div className="bg-amber-500/10 border border-amber-300 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    {isCompleted ? 'Status' : isArrived ? 'On Site' : 'Estimated Arrival'}
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {isCompleted
                      ? 'Completed'
                      : isArrived
                      ? 'Technician Arrived'
                      : `${booking.estimatedEtaMinutes || 8} Minutes`}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-500 text-slate-950 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              {/* Technician Info */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Assigned Verified Partner
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
                    {booking.technician?.user?.name?.[0] || 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-lg text-slate-900">
                        {booking.technician?.user?.name || 'Suresh Kumar'}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1 font-bold text-amber-700">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {booking.technician?.ratingAverage || '4.9'}
                      </span>
                      <span>•</span>
                      <span>Verified Mechanic</span>
                    </div>
                  </div>
                </div>

                {/* Call Button */}
                <a
                  href={`tel:${booking.technician?.user?.phone || '9876500001'}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-all"
                >
                  <Phone className="w-4 h-4 text-brand-400" />
                  <span>Call Mechanic ({booking.technician?.user?.phone || '9876500001'})</span>
                </a>
              </div>
            </div>

            {/* Price Quote Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Agreed Service Quote
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {booking.paymentStatus === PaymentStatus.PAID ? 'Paid' : 'Payment Due'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {booking.service?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.isQuoteApprovedByCustomer ? 'Standard Quote' : 'Revised Quote'}
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  ₹{booking.approvedFinalAmount || booking.quotedPrice}
                </div>
              </div>

              {/* Pay Now Button if repair in progress or completed and not paid */}
              {(isInProgress || isCompleted) && booking.paymentStatus !== PaymentStatus.PAID && (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => handlePayNow('UPI')}
                    disabled={paymentLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹{booking.approvedFinalAmount || booking.quotedPrice} via UPI / Card</span>
                  </button>
                  <p className="text-[11px] text-gray-400 text-center">
                    Or pay cash directly to the mechanic upon completion.
                  </p>
                </div>
              )}

              {/* View / Print Tax Invoice Button when paid */}
              {booking.paymentStatus === PaymentStatus.PAID && (
                <div className="pt-2">
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/bookings/${booking._id}/invoice?format=html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <FileText className="w-4 h-4 text-brand-400" />
                    <span>View &amp; Print Tax Invoice (GST)</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live GPS Tracking Map Visual & Status Timeline */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Live Map Representation */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4 overflow-hidden relative min-h-[260px] flex flex-col justify-between">
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                    Live GPS Telemetry
                  </span>
                </div>
                <span className="text-xs text-gray-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  Updated Live
                </span>
              </div>

              {/* Animated Map Grid Graphic */}
              <div className="my-6 p-6 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-400" />
                    <span className="font-semibold text-gray-200">
                      Mechanic: 100ft Rd, Indiranagar
                    </span>
                  </div>
                  <span className="text-emerald-400 font-bold">Travelling En Route</span>
                </div>

                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full transition-all duration-1000"
                    style={{
                      width: isCompleted ? '100%' : isInProgress ? '85%' : isArrived ? '70%' : '45%',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>Your GPS Location: {booking.pickupLocation?.address || '100ft Road'}</span>
                  <span>Direct Route Active</span>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 z-10">
                *Technician location is verified and broadcasted strictly during active assistance.
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Assistance Timeline
              </h3>

              <div className="space-y-4">
                {booking.statusHistory?.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center shrink-0 font-bold mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{step.status}</div>
                      <div className="text-gray-500">{step.note}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Customer Quote Revision Approval */}
      {isAwaitingQuote && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 space-y-6 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Revised Quote Proposed</h3>
                <p className="text-xs text-gray-500">Inspection findings require updated pricing</p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
              <div className="text-xs font-semibold text-amber-900">
                Reason from Technician:
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                &ldquo;{booking.quoteRevisionReason || 'Additional repair components required after on-site physical diagnosis.'}&rdquo;
              </p>
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                <span className="text-xs text-amber-900">Revised Final Amount</span>
                <span className="text-2xl font-black text-slate-900">₹{booking.quotedPrice}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuoteResponse(false)}
                disabled={respondingToQuote}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl text-sm"
              >
                Decline & Cancel
              </button>
              <button
                onClick={() => handleQuoteResponse(true)}
                disabled={respondingToQuote}
                className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-black py-3 rounded-xl text-sm shadow-md"
              >
                Approve & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED: Rating & Review Modal */}
      {isCompleted && !reviewSubmitted && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Assistance Completed!</h3>
              <p className="text-xs text-gray-500">How was your service experience with the technician?</p>
            </div>
          </div>

          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Add feedback about speed, professionalism, or quality..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
            />

            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm"
            >
              Submit Rating
            </button>
          </form>
        </div>
      )}

      {reviewSubmitted && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Thank you! Your verified rating helps keep 10Min Help mechanics accountable and high-quality.</span>
        </div>
      )}
    </div>
  );
}
