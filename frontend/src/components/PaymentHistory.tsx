import React, { useMemo } from 'react';
import { Reservation, Car } from '../types';

interface PaymentHistoryProps {
  reservations: Reservation[];
  cars: Car[];
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ reservations, cars }) => {
  
  // Filter and sort payment history
  const paymentHistory = useMemo(() => {
    console.log('All reservations:', reservations);
    const paid = reservations.filter(res => {
      const isPaid = res.paid === true;
      console.log(`Reservation ${res.reservationId}: paid=${res.paid}, amount=${res.amount}`);
      return isPaid;
    });
    console.log('Paid reservations:', paid);
    return paid.sort((a, b) => {
      const timeA = new Date(a.paymentTime || '').getTime();
      const timeB = new Date(b.paymentTime || '').getTime();
      return timeB - timeA; // Most recent first
    });
  }, [reservations]);

  // Calculate total payments
  const totalPayments = useMemo(() => {
    return paymentHistory.reduce((sum, res) => sum + (res.amount || 0), 0);
  }, [paymentHistory]);

  const getCarOwner = (carId: string): string => {
    const car = cars.find(c => c.carId === carId);
    return car ? car.owner : 'Unknown';
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return dateString;
    }
  };

  const calculateDuration = (res: Reservation): string => {
    if (!res.parkingStarted || !res.endTime) return 'In Progress';
    try {
      const start = new Date(res.parkingStarted).getTime();
      const end = new Date(res.endTime).getTime();
      const diffMs = end - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💰 Payment History</h3>

      {/* Summary Cards */}
      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Payments</div>
          <div style={styles.summaryValue}>{paymentHistory.length}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Amount</div>
          <div style={styles.summaryValue}>${totalPayments.toFixed(2)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Avg Payment</div>
          <div style={styles.summaryValue}>
            ${paymentHistory.length > 0 ? (totalPayments / paymentHistory.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div style={styles.tableContainer}>
        {paymentHistory.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.tableHeaderCell}>Car ID</th>
                <th style={styles.tableHeaderCell}>Owner</th>
                <th style={styles.tableHeaderCell}>Amount</th>
                <th style={styles.tableHeaderCell}>Payment Date</th>
                <th style={styles.tableHeaderCell}>Parking Duration</th>
                <th style={styles.tableHeaderCell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((res, index) => (
                <tr key={index} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    <span style={styles.carId}>{res.carId}</span>
                  </td>
                  <td style={styles.tableCell}>{getCarOwner(res.carId)}</td>
                  <td style={styles.tableCell}>
                    <span style={styles.amount}>${res.amount?.toFixed(2) || '0.00'}</span>
                  </td>
                  <td style={styles.tableCell}>
                    {formatDate(res.paymentTime)}
                  </td>
                  <td style={styles.tableCell}>
                    {calculateDuration(res)}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(res.active ? styles.statusActive : styles.statusCompleted)
                    }}>
                      {res.active ? '🔄 Active' : '✅ Completed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.emptyMessage}>
            📭 No payment history yet
            <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
              Debug Info:<br/>
              Total reservations: {reservations.length}<br/>
              Reservations: {reservations.map(r => `${r.reservationId}(paid:${r.paid})`).join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Detailed View (Last 5 Payments) */}
      {paymentHistory.length > 0 && (
        <div style={styles.detailedSection}>
          <h4 style={styles.detailedTitle}>Recent Payments (Last 5)</h4>
          <div style={styles.paymentCards}>
            {paymentHistory.slice(0, 5).map((res, index) => (
              <div key={index} style={styles.paymentCard}>
                <div style={styles.paymentCardHeader}>
                  <div style={styles.paymentCardTitle}>
                    {res.carId} - {getCarOwner(res.carId)}
                  </div>
                  <div style={styles.paymentCardAmount}>${res.amount?.toFixed(2)}</div>
                </div>
                <div style={styles.paymentCardBody}>
                  <div style={styles.paymentCardRow}>
                    <span style={styles.paymentCardLabel}>Payment Time:</span>
                    <span>{formatDate(res.paymentTime)}</span>
                  </div>
                  <div style={styles.paymentCardRow}>
                    <span style={styles.paymentCardLabel}>Reservation ID:</span>
                    <span style={styles.reservationId}>{res.reservationId}</span>
                  </div>
                  <div style={styles.paymentCardRow}>
                    <span style={styles.paymentCardLabel}>Place ID:</span>
                    <span>{res.placeId}</span>
                  </div>
                  <div style={styles.paymentCardRow}>
                    <span style={styles.paymentCardLabel}>Parking Duration:</span>
                    <span>{calculateDuration(res)}</span>
                  </div>
                  {res.parkingStarted && (
                    <div style={styles.paymentCardRow}>
                      <span style={styles.paymentCardLabel}>Start Time:</span>
                      <span>{formatDate(res.parkingStarted)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    border: '1px solid #404040',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '20px',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  summaryCard: {
    backgroundColor: '#353535',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #505050',
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#aaa',
    fontWeight: '500',
    marginBottom: '5px',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4dd0e1',
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #404040',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  tableHeader: {
    backgroundColor: '#353535',
    borderBottom: '2px solid #505050',
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#4dd0e1',
    fontSize: '12px',
  },
  tableRow: {
    borderBottom: '1px solid #404040',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '12px',
    color: '#ccc',
  },
  carId: {
    backgroundColor: '#1a3a3a',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '500',
    color: '#4dd0e1',
  },
  amount: {
    fontWeight: 'bold',
    color: '#81c784',
    fontSize: '15px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  },
  statusActive: {
    backgroundColor: '#3d3300',
    color: '#ffcc00',
  },
  statusCompleted: {
    backgroundColor: '#1a3a1a',
    color: '#81c784',
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px',
  },
  detailedSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #404040',
  },
  detailedTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#4dd0e1',
    marginBottom: '15px',
  },
  paymentCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '15px',
  },
  paymentCard: {
    border: '1px solid #404040',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#353535',
  },
  paymentCardHeader: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentCardTitle: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  paymentCardAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  paymentCardBody: {
    padding: '12px',
  },
  paymentCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
  },
  paymentCardLabel: {
    fontWeight: '600',
    color: '#4dd0e1',
    marginRight: '8px',
  },
  reservationId: {
    fontFamily: 'monospace',
    color: '#aaa',
    fontSize: '11px',
  },
};

export default PaymentHistory;
