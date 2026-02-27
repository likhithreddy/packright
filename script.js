document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('createTripModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const form = document.getElementById('createTripForm');
    const tripsContainer = document.getElementById('tripsContainer');
    const emptyTripCard = document.getElementById('emptyTripCard');

    // Open modal from Header button or Empty Card placeholder
    const openModal = () => {
        modal.classList.add('active');
    };

    openBtn.addEventListener('click', openModal);
    if (emptyTripCard) {
        emptyTripCard.addEventListener('click', openModal);
    }

    // Close modal logic
    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => form.reset(), 300); // Clear form after animation completes
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close when clicking outside the modal container
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Handle Form Submission (Mocking creation of a trip)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Gather data
        const formData = new FormData(form);
        const tripName = formData.get('tripName');
        const destination = formData.get('tripDestination');
        const startDateRaw = formData.get('startDate'); // YYYY-MM-DD
        const endDateRaw = formData.get('endDate');

        // Simple date formatter (e.g. from 2024-07-20 to Jul 20, 2024)
        const formatDate = (dateString) => {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            const date = new Date(dateString + 'T00:00:00'); // Avoiding timezone shifts
            return date.toLocaleDateString('en-US', options);
        };

        const dateRange = startDateRaw && endDateRaw ? `${formatDate(startDateRaw)} - ${formatDate(endDateRaw)}` : 'Dates TBD';

        // Pick a random image from Unsplash for variety
        const randomImgId = Math.floor(Math.random() * 1000);
        const bgUrl = `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800&sig=${randomImgId}`;

        // Create the HTML for the new Trip Card
        const newCardHTML = `
      <article class="trip-card" style="animation: fadeInUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px);">
        <div class="trip-image" style="background-image: url('${bgUrl}');">
          <div class="trip-status pending">Planning</div>
        </div>
        <div class="trip-details">
          <div class="trip-header">
            <h3 class="trip-title">${tripName}</h3>
            <span class="trip-date">${dateRange}</span>
          </div>
          <p class="trip-location">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${destination}
          </p>
          <div class="trip-footer">
            <div class="collaborators">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${tripName}" class="collab-avatar" alt="Creator">
            </div>
            <button class="btn-secondary btn-small">View List</button>
          </div>
        </div>
      </article>
    `;

        // Insert the new card before the "Empty / Add New" placeholder
        emptyTripCard.insertAdjacentHTML('beforebegin', newCardHTML);

        // Close the modal and reset
        closeModal();
    });

});

// Add a simple entrance animation for newly created cards
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);
