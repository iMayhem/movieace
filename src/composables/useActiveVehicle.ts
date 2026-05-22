import { ref } from 'vue';

export type VehicleType = 'car' | 'plane' | 'boat' | 'superman';

const activeVehicle = ref<VehicleType>('car');

export function useActiveVehicle() {
    return {
        activeVehicle
    };
}
