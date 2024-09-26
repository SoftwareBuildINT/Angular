import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService } from '../data.service';
import { HttpClient } from '@angular/common/http';

export interface Site {
  ATM_ID: string;
  unitname: string;
  city: string;
  state: string;
  SiteStatus?: string;
}

@Component({
  selector: 'app-sidedetails',
  templateUrl: './sidedetails.component.html',
  styleUrls: ['./sidedetails.component.scss']
})
export class SidedetailsComponent implements OnInit {
  errorMessage: string | null = null;
  siteList: Site[] = [];
  searchTerm: string = '';
  onlineCount: number = 0;
  offlineCount: number = 0;
  percentage: number = 0; 

  currentPage: number = 1;
  itemsPerPage: number = 40;

  showModal: boolean = false;
  showSuccessModal: boolean = false;
  newSite: Site = {
    ATM_ID: '',
    unitname: '',
    city: '',
    state: '',
  };

  lhoId: string | null = null;

  // Filters for city, state, and status
  selectedCity: string = '';
  selectedState: string = ''; // New filter for state
  selectedStatus: string = '';

  uniqueStatuses: string[] = []; // For storing unique status options
  uniqueStates: string[] = []; // For storing unique state options

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dataService: DataService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.lhoId = this.route.snapshot.queryParams['lho_id'];
    this.fetchSiteList();
  }

  fetchSiteList(): void {
    if (this.lhoId) {
      this.dataService.getLhoList(this.lhoId).subscribe(
        (response: {
          totalLocations: number;
          totalOnline: number;
          totalOffline: number;
          totalPercentage: number;
          lhoDetails: {
            lho_id: number;
            lho_name: string;
            total_locations: number;
            onlineCount: number;
            offlineCount: number;
            percentage: number;
            atm_data: {
              atm_id: string;
              siteName: string;
              city: string;
              state: string;
              status: string;
            }[];
          }[];
        }) => {
          const lho = response.lhoDetails.find(lho => lho.lho_id === parseInt(this.lhoId!));
    
          if (lho) {
            // Map the site list from atm_data
            this.siteList = lho.atm_data.map(site => ({
              ATM_ID: site.atm_id,
              unitname: site.siteName,
              city: site.city,
              state: site.state,
              SiteStatus: site.status
            }));
    
            // Fetch onlineCount, offlineCount, and percentage directly from the API response
            this.onlineCount = lho.onlineCount;
            this.offlineCount = lho.offlineCount;
            const totalLocations = lho.total_locations;
            this.percentage = lho.percentage;
  
            // Extract unique statuses and states for dropdown filters
            this.uniqueStatuses = Array.from(new Set(this.siteList.map(site => site.SiteStatus?.toUpperCase())));
            this.uniqueStates = Array.from(new Set(this.siteList.map(site => site.state)));
          }
        },
        (error) => {
          console.error('Error fetching site list:', error);
          this.errorMessage = 'An error occurred while fetching site data.';
        }
      );
    }
  }
  


  // Filtering based on city, state, status, and search term
  filteredSites(): Site[] {
    let filtered = this.siteList;

    // Filter by search term
    if (this.searchTerm) {
      const lowercasedSearchTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(site =>
        site.unitname.toLowerCase().includes(lowercasedSearchTerm) ||
        site.ATM_ID.toLowerCase().includes(lowercasedSearchTerm)
      );
    }

    // Filter by selected city
    if (this.selectedCity) {
      filtered = filtered.filter(site => site.city === this.selectedCity);
    }

    // Filter by selected state
    if (this.selectedState) {
      filtered = filtered.filter(site => site.state === this.selectedState);
    }

    // Filter by selected status
    if (this.selectedStatus) {
      filtered = filtered.filter(site => site.SiteStatus?.toUpperCase() === this.selectedStatus.toUpperCase());
    }

    return this.paginatedSites(filtered);
  }

  // Function to handle the filters
  applyFilters(): void {
    this.filteredSites(); // This call is implicit as the filteredSites() method is called in the template
  }

  downloadSiteList(): void {
    const filteredData = this.filteredSites();
    const csvContent = this.convertToCSV(filteredData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'site_list.csv');
    link.click();
  }

  convertToCSV(data: Site[]): string {
    const header = ['ATM ID', 'Site Name', 'City', 'State', 'Site Status'];
    const rows = data.map(site => [
      site.ATM_ID,
      site.unitname,
      site.city,
      site.state,
      site.SiteStatus || ''
    ]);

    return [
      header.join(','), // header row
      ...rows.map(row => row.join(',')) // data rows
    ].join('\n');
  }

  paginatedSites(sites: Site[] = this.siteList): Site[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return sites.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage * this.itemsPerPage < this.siteList.length) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  navigateToDetails(site: Site): void {
    this.router.navigate(['/liveview'], { queryParams: { atmId: site.ATM_ID } });
  }

  openAddModal(): void {
    this.showModal = true;
  }

  closeAddModal(): void {
    this.showModal = false;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }

  saveSite(): void {
    if (!this.newSite.ATM_ID) {
      this.errorMessage = 'ATM ID is required';
      return;
    }

    const atmData = {
      atmId: this.newSite.ATM_ID,
      lho_id: this.lhoId,
    };

    console.log('New Site Data:', atmData);

    this.dataService.addATM(atmData).subscribe(
      (response) => {
        console.log('ATM added successfully:', response);
        this.fetchSiteList(); 
        this.closeAddModal();
        this.errorMessage = null; // Clear any previous error message
        this.showSuccessModal = true; // Show success modal
      },
      (error) => {
        if (error.status === 409) {
          console.error('Duplicate ATM ID:', error.error.message);
          this.errorMessage = error.error.message; // Set the error message
        } else {
          console.error('Error adding new ATM:', error);
        }
      }
    );
  }

  // Pagination details
  get startItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.siteList.length ? this.siteList.length : end;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']); 
  }
}
