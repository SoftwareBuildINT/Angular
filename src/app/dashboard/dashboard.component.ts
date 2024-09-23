import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  showModal = false;
  lhoName = '';
  searchTerm: string = ''; // Holds the search input
  lhoList: { LHO_Name: string; lho_id: number; total_locations: number; onlineCount: number; offlineCount: number; percentage: number; }[] = [];
  filteredLhoList: { LHO_Name: string; lho_id: number; total_locations: number; onlineCount: number; offlineCount: number; percentage: number; }[] = [];
  userRole: string | null = null; // Track user role

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
    this.fetchLhoList(); // Fetch LHO data on component initialization
    this.getUserRole(); // Fetch the user role from local storage
  }

  getUserRole(): void {
    this.userRole = localStorage.getItem('roleId'); // Fetch the role stored as a string
    if (!this.userRole) {
      console.error('Role ID is not set or not recognized:', this.userRole); // Log for debugging
    }
  }

  navigateToSiteDetails(lho: { LHO_Name: string; lho_id: number }) {
    if (lho.lho_id !== null) {
      this.router.navigate(['/sidedetails'], { queryParams: { lho_id: lho.lho_id } });
    }
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  clearInput() {
    this.lhoName = ''; // Clear the input field
  }

  saveLho() {
    if (this.lhoName.trim()) {
      console.log('LHO Name:', this.lhoName);
      this.http.post('http://sbi-dashboard.hitachi.ifiber.in:7558/api/add-lho', { lho_name: this.lhoName })
        .subscribe({
          next: (response: any) => {
            console.log('Response from server:', response);
            alert(response.message || 'LHO saved successfully.');
            this.closeModal(); // Close the modal after saving
            this.fetchLhoList(); // Refresh the LHO list after saving
          },
          error: (error) => {
            console.error('Error saving LHO:', error);
            if (error.status === 409) {
              alert('LHO Name already exists in the database.');
            } else {
              alert('An error occurred while saving the LHO.');
            }
          }
        });
    } else {
      alert('Please enter a valid LHO Name');
    }
  }

  fetchLhoList() {
    this.http.get<{ lho_id: number; lho_name: string; total_locations: number; onlineCount: number; offlineCount: number; percentage: number; }[]>('http://sbi-dashboard.hitachi.ifiber.in:7558/api/lho-list')
      .subscribe({
        next: (response) => {
          console.log('LHO List:', response);
          this.lhoList = response.map(lho => ({
            LHO_Name: lho.lho_name,
            lho_id: lho.lho_id,
            total_locations: lho.total_locations,
            onlineCount: lho.onlineCount,
            offlineCount: lho.offlineCount,
            percentage: parseFloat(lho.percentage.toFixed(2)) // Convert back to a number
          }));
          this.filteredLhoList = [...this.lhoList]; // Initialize the filtered list
        },
        error: (error) => {
          console.error('Error fetching LHO list:', error);
          alert('An error occurred while fetching the LHO list.');
        }
      });
  }

  // Method to filter the LHO list based on search input
  filterLhoList() {
    this.filteredLhoList = this.lhoList.filter(lho =>
      lho.LHO_Name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
