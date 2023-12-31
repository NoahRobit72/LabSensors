import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EditAlarmModalComponent } from '../edit-alarm-modal/edit-alarm-modal.component';
import { DeleteSensorModalComponent } from '../delete-sensor-modal/delete-sensor-modal.component';
import { AddAlarmModalComponent } from '../add-alarm-modal/add-alarm-modal.component';
import { ApiService } from '../api.service';
import { AuthService } from '../auth.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface ConfigData {
  _id: string;
  DeviceID: number;
  DeviceName: string;
  Frequency: number;
  Units: string;
}

@Component({
  selector: 'app-alarm',
  templateUrl: './alarm.component.html',
  styleUrls: ['./alarm.component.css']
})
export class AlarmComponent implements OnInit, OnDestroy {
  labApi: any;
  alarms: any[] = [];
  editedAlarm: any;
  deletedAlarm: any;
  isModalOpen = false;
  modalRef: NgbModalRef | null = null;
  deviceNames: string[] = [];
  private dataRefreshSubscription: Subscription | undefined;

  constructor(
    private modalService: NgbModal,
    private apiService: ApiService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Fetch labApi from AuthService
    this.labApi = this.authService.labApi;

    // Fetch initial data
    this.fetchData();

    // Set up periodic data refresh every 10 seconds
    this.dataRefreshSubscription = interval(10000)
      .pipe(
        switchMap(() => this.apiService.getAllAlarms(this.labApi))
      )
      .subscribe(
        (response) => {
          if (response.success) {
            this.alarms = response.data;
          }
          else {
            console.error(response.message);
          }
        },
        (error) => {
          console.error('Error fetching alarm data:', error);
        }
      );
  }

  ngOnDestroy(): void {
    // Unsubscribe from the data refresh subscription to avoid memory leaks
    if (this.dataRefreshSubscription) {
      this.dataRefreshSubscription.unsubscribe();
    }
  }

  private fetchData(): void {
    this.apiService.getAllAlarms(this.labApi).subscribe(
      (response) => {
        if (response.success) {
          this.alarms = response.data;
        }
        else {
          console.error(response.message);
        }
      },
      (error) => {
        console.error('Error fetching alarm data:', error);
      }
    );

    this.apiService.getHomePageData(this.labApi).subscribe(
      (response) => {
        if (response.success) {
          for (let config of response.data) {
            this.deviceNames.push(config.DeviceName);
          }
        }
        else {
          console.error(response.message);
        }
      },
      (error) => {
        console.error('Error fetching config data:', error);
      }
    );
  }

  openEditModal(sensor: any): void {
    this.editedAlarm = { ...sensor };
    this.modalRef = this.modalService.open(EditAlarmModalComponent, { centered: true, size: 'lg' });
    this.modalRef.componentInstance.editedAlarm = this.editedAlarm;

    // Subscribe to the close and saveChanges events
    this.modalRef.componentInstance.closeModalEvent.subscribe(() => this.closeModal());
    this.modalRef.componentInstance.saveChangesEvent.subscribe((formData: any) => this.saveChanges(formData));

    this.isModalOpen = true;
  }

  openDeleteModal(sensor: any): void {
    this.deletedAlarm = { ...sensor };
    this.modalRef = this.modalService.open(DeleteSensorModalComponent, { centered: true, size: 'lg' });
    this.modalRef.componentInstance.deletedSensor = this.deletedAlarm;

    // Subscribe to the close and deleteSensor events
    this.modalRef.componentInstance.closeModalEvent.subscribe(() => this.closeModal());
    this.modalRef.componentInstance.deleteSensorEvent.subscribe(() => this.deleteSensor());

    this.isModalOpen = true;
  }

  openAlarmModal(): void {
    this.modalRef = this.modalService.open(AddAlarmModalComponent, { centered: true, size: 'lg' });
    this.modalRef.componentInstance.deviceNames = this.deviceNames;

    this.modalRef.componentInstance.addAlarmEvent.subscribe((formData: any) => this.addAlarm(formData));
    this.modalRef.componentInstance.closeModalEvent.subscribe(() => this.closeModal());
    this.isModalOpen = true;
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.isModalOpen = false;
    }
  }

  saveChanges(formData: any): void {
    console.log(formData);
    this.apiService.editAlarm(this.labApi, formData).subscribe(
      (response) => {
        if (response.success) {
          const index = this.alarms.findIndex(alarm => alarm.AlarmID === this.editedAlarm.AlarmID);

          if (index !== -1) {
            this.alarms[index] = { ...formData };
          }
        }
        else {
          console.error(response.message);
        }
      },
      (error) => {
        console.error('Error updating alarm data:', error);
      }
    )

    this.closeModal();
  }

  deleteSensor(): void {
    this.apiService.removeAlarm(this.labApi, this.deletedAlarm.AlarmID).subscribe(
      (response) => {
        if (response.success) {
          const index = this.alarms.findIndex(alarm => alarm.AlarmID === this.deletedAlarm.AlarmID);
  
          if (index !== -1) {
            this.alarms.splice(index, 1);
          }
  
        }
        else {
          console.error(response.message);
        }
      },
      (error) => {
        console.error('Error removing alarm:', error);
      }
    )
  
    this.closeModal();
  }
  

  addAlarm(formData: any): void {
    console.log(formData);
    this.apiService.addAlarm(this.labApi, formData).subscribe(
      (response) => {
        if (response.success) {
          formData['Status'] = 'Not Triggered';
          const index = this.alarms.length;
          formData.AlarmID = index;
          this.alarms.push(formData);
        }
        else {
          console.error(response.message);
        }
      },
      (error) => {
        console.error('Error adding alarm:', error);
      }
    )

    this.closeModal();
  }

  editAlarm(alarm: any): void {
    this.openEditModal(alarm);
  }

  deleteAlarm(alarm: any): void {
    this.openDeleteModal(alarm);
  }

  getBackgroundColor(status: string): string {
    return status === 'Triggered' ? 'rgba(255, 99, 71, 0.1)' : 'white';
  }

}
