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
  searchTerm: string = '';
  lhoList: any[] = [];
  filteredLhoList: any[] = [];
  atmList: string[] = []; // Array to store ATM list for suggestions
  filteredAtmList: string[] = [];
  userRole: string | null = null;

  totalLocations: number = 0;
  totalOnline: number = 0;
  totalOffline: number = 0;
  totalPercentage: number = 0;
  loading: boolean = true;

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
    this.fetchLhoList();
    this.getUserRole();
    this.securanceLogin();
    this.fetchAtmList();
  }

  getUserRole(): void {
    this.userRole = localStorage.getItem('roleId');
    if (!this.userRole) {
      console.error('Role ID is not set or not recognized:', this.userRole);
    }
  }

  // Fetch the ATM list for autocomplete suggestions
  fetchAtmList(): void {
    this.http.get<{ atm_list: string[] }>('http://localhost:7558/atm-list')
      .subscribe({
        next: (response) => {
          //console.log('ATM list:', response);
          this.atmList = response.atm_list;
        },
        error: (error) => {
          console.error('Error fetching ATM list:', error);
        }
      });
  }

  // Filter the ATM list based on the user's search term
  filterAtmList(): void {
    if (this.searchTerm) {
      this.filteredAtmList = this.atmList.filter(atm =>
        atm.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredAtmList = [];
    }
  }

  selectAtm(atmId: string) {
    this.searchTerm = atmId;
    this.router.navigate(['/liveview'], { queryParams: { atm_id: atmId } });
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
    this.lhoName = '';
  }

  saveLho() {
    if (this.lhoName.trim()) {
      this.http.post('http://localhost:7558/add-lho', { lho_name: this.lhoName })
        .subscribe({
          next: (response: any) => {
            alert(response.message || 'LHO saved successfully.');
            this.closeModal();
            this.fetchLhoList();
          },
          error: (error) => {
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
    this.loading = true;
    this.http.get<{
      totalLocations: number;
      totalOnline: number;
      totalOffline: number;
      totalPercentage: number;
      lhoDetails: any[];
    }>('http://localhost:7558/lho-list')
      .subscribe({
        next: (response) => {
          this.totalLocations = response.totalLocations;
          this.totalOnline = response.totalOnline;
          this.totalOffline = response.totalOffline;
          this.totalPercentage = response.totalPercentage;

          this.lhoList = response.lhoDetails.map(lho => ({
            LHO_Name: lho.lho_name,
            lho_id: lho.lho_id,
            total_locations: lho.total_locations,
            onlineCount: lho.onlineCount,
            offlineCount: lho.offlineCount,
            percentage: lho.percentage
          }));

          this.lhoList.sort((a, b) => a.LHO_Name.localeCompare(b.LHO_Name));
          this.filteredLhoList = [...this.lhoList];
          this.loading = false;
        },
        error: () => {
          alert('An error occurred while fetching the LHO list.');
          this.loading = false;
        }
      });
  }

  securanceLogin() {
    const loginPayload = {
      email: 'Hitachi.SBI@securens.in',
      password: 'E#K89GHp$boss'
    };

    this.http.post<{ token: string; services: string }>('https://apip.sspl.securens.in:14333/api/login', loginPayload)
      .subscribe({
        next: (response) => {
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('services', response.services);
        },
        error: (error) => {
          console.error('Login error:', error);
          alert('Login failed. Please check your credentials.');
        }
      });
  }
}
